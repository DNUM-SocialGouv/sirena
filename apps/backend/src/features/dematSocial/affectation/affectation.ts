import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { getLoggerStore } from '../../../libs/asyncLocalStorage.js';
import { type Prisma, prisma } from '../../../libs/prisma.js';
import { sendEntiteAssignedNotification } from '../../entites/entite.notification.service.js';
import { createDefaultRequeteEtapes } from '../../requeteEtapes/requetesEtapes.service.js';
import { buildSituationContext } from './buildSituationContext.js';
import { runDecisionTree } from './decisionTree.js';
import { findGeoByPostalCode } from './geo/geoIndex.js';
import type { EntiteAdminType, SituationContext } from './types.js';

type Assignment = {
  situationId: string;
  types: EntiteAdminType[];
  context: SituationContext;
};

const assignDefaultRequeteEtapes = async (requeteId: string, entiteId: string, tx: Prisma.TransactionClient) => {
  try {
    const etapes = await tx.requeteEtape.findMany({
      where: {
        requeteId,
        entiteId,
      },
    });

    // Default steps already created
    if (etapes.length > 0) {
      return;
    }

    await createDefaultRequeteEtapes(requeteId, entiteId, tx, null);
  } catch (err) {
    const logger = getLoggerStore();
    logger.error({ requeteId, entiteId, err }, 'Error assigning default requete etapes');
  }
};

/**
 * Algorithm to automatically assign entities to a requete based on the situation context (demat.social or phone "PLATEFORME")
 * @param unknownId - The requete.id (RD-****-***) or the dematSocialId
 */
export async function assignEntitesToRequeteTask(unknownId: string) {
  const logger = getLoggerStore();

  // You can choose to pass the requete.id (RD-****-***) or the dematSocialId
  const dematSocialIdNumber = Number.parseInt(unknownId, 10);
  const isDematSocialId = !Number.isNaN(dematSocialIdNumber) && dematSocialIdNumber.toString() === unknownId;

  const requete = await prisma.requete.findFirst({
    where: {
      OR: [{ id: unknownId }, ...(isDematSocialId ? [{ dematSocialId: dematSocialIdNumber }] : [])],
    },
    include: {
      situations: {
        include: {
          lieuDeSurvenue: {
            include: { adresse: true },
          },
          misEnCause: {
            include: {
              misEnCauseType: true,
              misEnCauseTypePrecision: true,
            },
          },
          faits: {
            include: {
              motifsDeclaratifs: {
                include: {
                  motifDeclaratif: true,
                },
              },
              motifs: {
                include: {
                  motif: true,
                },
              },
              maltraitanceTypes: {
                include: {
                  maltraitanceType: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!requete) {
    throw new Error(`Requete ${unknownId} not found`);
  }

  const requeteId = requete.id;

  // 2) For each situation, determine the authority types to assign (ARS, CD, DD)
  const allAssignments: Array<Assignment> = [];
  const entiteIdsToLinkToRequete = new Set<string>();
  const situationEntitesToLink: Array<{
    situationId: string;
    entiteId: string;
  }> = [];

  for (const situation of requete.situations) {
    try {
      const context = buildSituationContext(situation);
      logger.info({ context }, `Request context for ${requeteId} - situation ${situation.id}`);
      const types = await runDecisionTree(context, {
        requeteId,
        situationId: situation.id,
      });
      logger.info({ types }, `Entity types determined for request ${requeteId} - situation ${situation.id}`);

      allAssignments.push({ situationId: situation.id, types, context });
    } catch (err) {
      logger.error(
        { requeteId, situationId: situation.id, err },
        'Error building situation context or running decision tree, skipping assignment',
      );
    }
  }

  // 3) Resolve the concrete entities (ex: "ARS - Normandie", "CD - Calvados") from the postal code/INSEE
  for (const a of allAssignments) {
    const s = requete.situations.find((x) => x.id === a.situationId);
    if (!s) {
      logger.error({ requeteId, situationId: a.situationId }, 'Situation not found, skipping assignment');
      continue;
    }

    if (!a.context.postalCode) {
      logger.error({ requeteId, situationId: s.id }, 'Postal code not found, skipping assignment');
      continue;
    }

    // 3.1) Geolocation of the situation (department, region)
    const geo = await findGeoByPostalCode(a.context.postalCode);

    if (!geo) {
      logger.error({ requeteId, situationId: s.id }, 'Geolocation not found, skipping assignment');
      continue;
    }

    logger.info({ geo }, `Geolocation found for request ${requeteId} - situation ${s.id}`);

    // 3.2) Find the entities in the database for each type
    for (const t of a.types) {
      // CD/DD: accept both INSEE ctcdCode (e.g. "76D") and convention departement+type (e.g. "76DD")
      const ctcdCodesForCdDd = ['CD', 'DD'].includes(t)
        ? [geo.ctcdCode, `${geo.departementCode}${t}`].filter((c, i, arr) => arr.indexOf(c) === i)
        : null;

      const whereClause = {
        entiteTypeId: t,
        entiteMereId: null,
        ...(ctcdCodesForCdDd
          ? {
              ctcdCode: { in: ctcdCodesForCdDd },
              departementCode: geo.departementCode,
            }
          : {}),
        ...(['ARS'].includes(t) ? { regionCode: geo.regionCode } : {}),
      };
      logger.info(
        { type: t, whereClause },
        `Searching for entity of type ${t} for request ${requeteId} - situation ${s.id}`,
      );

      const entite = await prisma.entite.findFirst({
        where: whereClause,
      });

      if (!entite) {
        logger.error(
          { requeteId, situationId: s.id, type: t, geo, whereClause },
          'Entite not found, skipping assignment',
        );
        continue;
      }

      logger.info(
        { entiteId: entite.id, entiteNom: entite.nomComplet },
        `Entity found for request ${requeteId} - situation ${s.id} - type ${t}`,
      );

      entiteIdsToLinkToRequete.add(entite.id);
      situationEntitesToLink.push({ situationId: s.id, entiteId: entite.id });
    }
  }

  // 4) Upsert of RequeteEntite + SituationEntite + create default requete etapes for each entite
  // Existing entities on the requete before this run → only newly assigned entities get a notification email
  const existingRequeteEntites = await prisma.requeteEntite.findMany({
    where: { requeteId },
    select: { entiteId: true },
  });
  const existingEntiteIds = new Set(existingRequeteEntites.map((re) => re.entiteId));

  let isFallback = false;
  try {
    if (entiteIdsToLinkToRequete.size === 0) {
      isFallback = true;

      // Try to deduce the region from any available postal code
      const postalCodeCandidates = [
        ...allAssignments.map((a) => a.context.postalCode).filter(Boolean),
        ...requete.situations.map((s) => s.lieuDeSurvenue.codePostal).filter(Boolean),
      ];

      let fallbackArs: { id: string; nomComplet: string | null } | null = null;

      for (const postalCode of postalCodeCandidates) {
        if (!postalCode) continue;
        const geo = await findGeoByPostalCode(postalCode);
        if (!geo?.regionCode) continue;

        fallbackArs = await prisma.entite.findFirst({
          where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: geo.regionCode },
        });

        if (fallbackArs) {
          logger.warn(
            { requeteId, postalCode, regionCode: geo.regionCode, arsId: fallbackArs.id },
            'No entity assigned, falling back to regional ARS',
          );
          break;
        }
      }

      // Ultimate fallback: ARS Normandie if region could not be determined
      if (!fallbackArs) {
        logger.warn({ requeteId }, 'Region not deducible, falling back to ARS Normandie');
        fallbackArs = await prisma.entite.findFirst({
          where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: '28' },
        });
      }

      if (!fallbackArs) {
        logger.error({ requeteId }, 'ARS Normandie not found in database, cannot assign fallback');
        throw new Error('ARS Normandie not found in database');
      }

      entiteIdsToLinkToRequete.add(fallbackArs.id);
      for (const situation of requete.situations) {
        situationEntitesToLink.push({ situationId: situation.id, entiteId: fallbackArs.id });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const entiteId of entiteIdsToLinkToRequete) {
        await tx.requeteEntite.upsert({
          where: { requeteId_entiteId: { requeteId, entiteId } },
          create: {
            requeteId,
            entiteId,
            statutId: REQUETE_STATUT_TYPES.NOUVEAU,
          },
          update: {},
        });

        await assignDefaultRequeteEtapes(requeteId, entiteId, tx);
      }

      for (const { situationId, entiteId } of situationEntitesToLink) {
        await tx.situationEntite.upsert({
          where: { situationId_entiteId: { situationId, entiteId } },
          create: { situationId, entiteId },
          update: {},
        });
      }

      await tx.changeLog.create({
        data: {
          entity: 'Requete',
          entityId: requeteId,
          action: 'AFFECTATION_ENTITES',
          before: undefined,
          after: {
            entiteIds: Array.from(entiteIdsToLinkToRequete),
            isFallback,
          },
          changedById: null,
        },
      });
    });

    logger.info({ requeteId, entiteIds: Array.from(entiteIdsToLinkToRequete) }, 'Affectation OK');

    // Notify only entities newly assigned to this requete (first assignment or new assignment)
    const newEntiteIds = Array.from(entiteIdsToLinkToRequete).filter((id) => !existingEntiteIds.has(id));
    if (newEntiteIds.length > 0) {
      try {
        await sendEntiteAssignedNotification(requeteId, newEntiteIds);
      } catch (notificationErr) {
        logger.error(
          { requeteId, newEntiteIds, err: notificationErr },
          'Failed to send entity assigned notification, but affectation succeeded',
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
