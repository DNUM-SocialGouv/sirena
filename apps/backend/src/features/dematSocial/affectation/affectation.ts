import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { createDefaultRequeteEtapes } from '@/features/requeteEtapes/requetesEtapes.service';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import { type Prisma, PrismaClient } from '../../../../generated/client';
import { buildSituationContextFromDemat } from './buildSituationContext';
import { runDecisionTree } from './decisionTree';
import { findGeoByPostalCode } from './geo/geoIndex';
import type { EntiteAdminType, SituationContext } from './types';

type Assignment = { situationId: string; types: EntiteAdminType[]; context: SituationContext };

const assignDefaultRequeteEtapes = async (
  requeteId: string,
  entiteId: string,
  receptionDate: Date,
  tx: Prisma.TransactionClient,
) => {
  const createRequeteEtapeChangelog = async (
    etapeId: string,
    action: ChangeLogAction,
    before: Prisma.JsonObject | null,
    after: Prisma.JsonObject | null,
    changedById: string,
  ) => {
    await createChangeLog({
      entity: 'RequeteEtape',
      entityId: etapeId,
      action,
      before,
      after,
      changedById,
    });
  };
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

    const result = await createDefaultRequeteEtapes(requeteId, entiteId, receptionDate, tx);

    if (!result) {
      return;
    }

    const { etape1, etape2 } = result;

    const p1 = createRequeteEtapeChangelog(
      etape1.id,
      ChangeLogAction.CREATED,
      null,
      {
        id: etape1.id,
        nom: etape1.nom,
        estPartagee: etape1.estPartagee,
        statutId: etape1.statutId,
        requeteId: etape1.requeteId,
        entiteId: etape1.entiteId,
        clotureReasonId: etape1.clotureReasonId,
        createdAt: etape1.createdAt.toISOString(),
      } as Prisma.JsonObject,
      'SYSTEM',
    );

    const p2 = createRequeteEtapeChangelog(
      etape2.id,
      ChangeLogAction.CREATED,
      null,
      {
        id: etape2.id,
        nom: etape2.nom,
        estPartagee: etape2.estPartagee,
        statutId: etape2.statutId,
        requeteId: etape2.requeteId,
        entiteId: etape2.entiteId,
        clotureReasonId: etape2.clotureReasonId,
        createdAt: etape2.createdAt.toISOString(),
      } as Prisma.JsonObject,
      'SYSTEM',
    );

    await Promise.all([p1, p2]);
  } catch (err) {
    const logger = getLoggerStore();
    logger.error({ requeteId, entiteId, err }, 'Error assigning default requete etapes');
  }
};

/**
 * Algorithm to automatically assign entities to a requete based on the situation context
 * @param unknownId - The requete.id (RD-****-***) or the dematSocialId
 */
export async function assignEntitesToRequeteTask(unknownId: string) {
  const logger = getLoggerStore();
  const prisma = new PrismaClient({
    transactionOptions: {
      timeout: 120000,
      maxWait: 20000,
    },
  });

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

  // 2) For each situation, determine the authority types to assign (ARS, CD, DDETS)
  const allAssignments: Array<Assignment> = [];

  for (const situation of requete.situations) {
    try {
      const context = buildSituationContextFromDemat(situation);
      const types = await runDecisionTree(context); // -> ['ARS', 'CD'] for example

      allAssignments.push({ situationId: situation.id, types, context });
    } catch (err) {
      logger.error(
        { requeteId, situationId: situation.id, err },
        'Error building situation context or running decision tree, skipping assignment',
      );
    }
  }

  // 3) Resolve the concrete entities (ex: "ARS - Normandie", "CD - Calvados") from the postal code/INSEE
  const entiteIdsToLinkToRequete = new Set<string>();
  const situationEntitesToLink: Array<{ situationId: string; entiteId: string }> = [];

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
    const geo = findGeoByPostalCode(a.context.postalCode);

    if (!geo) {
      logger.error({ requeteId, situationId: s.id }, 'Geolocation not found, skipping assignment');
      continue;
    }

    // 3.2) Find the entities in the database for each type
    for (const t of a.types) {
      const entite = await prisma.entite.findFirst({
        where: {
          entiteTypeId: t,
          entiteMereId: null,
          ...(['CD', 'DDETS'].includes(t) ? { ctcdCode: geo.ctcdCode } : {}),
          ...(['ARS'].includes(t) ? { regionCode: geo.regionCode } : {}),
        },
      });

      if (!entite) {
        logger.error({ requeteId, situationId: s.id, type: t }, 'Entite not found, skipping assignment');
        continue;
      }

      entiteIdsToLinkToRequete.add(entite.id);
      situationEntitesToLink.push({ situationId: s.id, entiteId: entite.id });
    }
  }

  // 4) Upsert of RequeteEntite + SituationEntite + create default requete etapes for each entite
  if (entiteIdsToLinkToRequete.size === 0) {
    logger.info({ requeteId }, 'No entity to assign for now');
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const entiteId of entiteIdsToLinkToRequete) {
      await tx.requeteEntite.upsert({
        where: { requeteId_entiteId: { requeteId, entiteId } },
        create: { requeteId, entiteId },
        update: {},
      });

      await assignDefaultRequeteEtapes(requeteId, entiteId, requete.receptionDate || new Date(), tx);
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
        after: { entiteIds: Array.from(entiteIdsToLinkToRequete) },
        changedById: 'system',
      },
    });
  });

  logger.info({ requeteId, entiteIds: Array.from(entiteIdsToLinkToRequete) }, 'Affectation OK');

  await prisma.$disconnect();
}
