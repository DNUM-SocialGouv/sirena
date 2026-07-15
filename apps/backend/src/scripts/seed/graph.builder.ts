import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { type Prisma, prisma } from '../../libs/prisma.js';
import type { PersonneBlueprint, RequeteBlueprint, SituationBlueprint } from './blueprint.js';
import type { Agent, SeedContext } from './context.js';

export type GeneratedRequete = {
  id: string;
  familyLabel: string;
  origin: RequeteBlueprint['origin'];
  statut: RequeteBlueprint['statutCible'];
  entite: string;
};

const ID_PREFIX: Record<RequeteBlueprint['origin'], string> = {
  MANUAL: 'RS',
  DEMATSOCIAL: 'RF',
};

/**
 * Local functional-id generator: same format as the app (AAAA-MM-{RS|RF}N) but
 * without the Redis lock — the seed is single-process and sequential. Kept here
 * so the CLI stays isolated from the Redis-coupled prod service.
 */
const generateRequeteId = async (
  tx: Prisma.TransactionClient,
  origin: RequeteBlueprint['origin'],
  now: Date,
): Promise<string> => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${month}-${ID_PREFIX[origin]}`;

  const [result] = await tx.$queryRaw<{ maxNumber: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING(id FROM ${monthPrefix.length + 1}::int) AS INTEGER)) AS "maxNumber"
    FROM "Requete"
    WHERE id LIKE ${`${monthPrefix}%`}
      AND id ~ ${`^${monthPrefix}[0-9]+$`}
  `;

  return `${monthPrefix}${(result?.maxNumber ?? 0) + 1}`;
};

/** Builds the nested PersonneConcernee create payload (identite + adresse). */
const mapPersonne = (p: PersonneBlueprint) => ({
  estVictime: p.estVictime,
  estIdentifie: p.estIdentifie,
  estHandicapee: p.estHandicapee,
  veutGarderAnonymat: p.veutGarderAnonymat,
  mesureProtection: p.mesureProtection ?? undefined,
  age: p.ageId ? { connect: { id: p.ageId } } : undefined,
  lienVictime: p.lienVictimeId ? { connect: { id: p.lienVictimeId } } : undefined,
  identite: {
    create: {
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      telephone: p.telephone,
      civilite: p.civiliteId ? { connect: { id: p.civiliteId } } : undefined,
    },
  },
  adresse: p.adresse ? { create: { ...p.adresse } } : undefined,
});

/** Writes a situation and its lieu / misEnCause / demarches / fait subgraph. */
const writeSituation = async (
  tx: Prisma.TransactionClient,
  requeteId: string,
  situation: SituationBlueprint,
): Promise<void> => {
  const lieu = await tx.lieuDeSurvenue.create({
    data: {
      codePostal: situation.lieu.codePostal,
      commentaire: situation.lieu.commentaire,
      societeTransport: situation.lieu.societeTransport,
      finess: situation.lieu.finess,
      lieuType: situation.lieu.lieuTypeId ? { connect: { id: situation.lieu.lieuTypeId } } : undefined,
      transportType: situation.lieu.transportTypeId ? { connect: { id: situation.lieu.transportTypeId } } : undefined,
      adresse: situation.lieu.adresse ? { create: { ...situation.lieu.adresse } } : undefined,
    },
    select: { id: true },
  });

  const misEnCause = await tx.misEnCause.create({
    data: {
      rpps: situation.misEnCause.rpps,
      civilite: situation.misEnCause.civilite,
      nom: situation.misEnCause.nom,
      prenom: situation.misEnCause.prenom,
      commentaire: situation.misEnCause.commentaire,
      misEnCauseType: situation.misEnCause.misEnCauseTypeId
        ? { connect: { id: situation.misEnCause.misEnCauseTypeId } }
        : undefined,
    },
    select: { id: true },
  });

  const demarches = await tx.demarchesEngagees.create({
    data: {
      dateContactEtablissement: situation.demarches.dateContactEtablissement,
      etablissementARepondu: situation.demarches.etablissementARepondu,
      datePlainte: situation.demarches.datePlainte,
      organisme: situation.demarches.organisme,
      commentaire: situation.demarches.commentaire,
      autoriteType: situation.demarches.autoriteTypeId
        ? { connect: { id: situation.demarches.autoriteTypeId } }
        : undefined,
      demarches: situation.demarches.demarchesIds.length
        ? { connect: situation.demarches.demarchesIds.map((id) => ({ id })) }
        : undefined,
    },
    select: { id: true },
  });

  const created = await tx.situation.create({
    data: {
      requete: { connect: { id: requeteId } },
      lieuDeSurvenue: { connect: { id: lieu.id } },
      misEnCause: { connect: { id: misEnCause.id } },
      demarchesEngagees: { connect: { id: demarches.id } },
      situationEntites: {
        create: situation.entiteIds.map((entiteId) => ({ entite: { connect: { id: entiteId } } })),
      },
    },
    select: { id: true },
  });

  await tx.fait.create({
    data: {
      situation: { connect: { id: created.id } },
      dateDebut: situation.fait.dateDebut,
      dateFin: situation.fait.dateFin,
      commentaire: situation.fait.commentaire,
    },
  });

  if (situation.fait.motifsDeclaratifsIds.length) {
    await tx.faitMotifDeclaratif.createMany({
      data: situation.fait.motifsDeclaratifsIds.map((motifDeclaratifId) => ({
        situationId: created.id,
        motifDeclaratifId,
      })),
      skipDuplicates: true,
    });
  }
  if (situation.fait.consequencesIds.length) {
    await tx.faitConsequence.createMany({
      data: situation.fait.consequencesIds.map((consequenceId) => ({ situationId: created.id, consequenceId })),
      skipDuplicates: true,
    });
  }
  if (situation.fait.maltraitanceTypesIds.length) {
    await tx.faitMaltraitanceType.createMany({
      data: situation.fait.maltraitanceTypesIds.map((maltraitanceTypeId) => ({
        situationId: created.id,
        maltraitanceTypeId,
      })),
      skipDuplicates: true,
    });
  }
};

const DEFAULT_ETAPES = [
  { statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT, nom: 'Création de la requête', type: REQUETE_ETAPE_TYPES.CREATION },
  {
    statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
    nom: "Envoi de l'accusé de réception",
    type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
  },
] as const;

/**
 * Default steps every request gets, per attached entité. `createdById` is left
 * null (like the app) so the acknowledgment automation, which matches steps with
 * `createdBy: null`, still picks them up.
 */
const writeDefaultEtapes = async (tx: Prisma.TransactionClient, requeteId: string, entiteId: string): Promise<void> => {
  for (const etape of DEFAULT_ETAPES) {
    await tx.requeteEtape.create({
      data: { requeteId, entiteId, statutId: etape.statutId, nom: etape.nom, type: etape.type },
    });
  }
};

/** Extra rich steps (notes, attachments, closure) on the primary entité. */
const writeExtraEtapes = async (
  tx: Prisma.TransactionClient,
  bp: RequeteBlueprint,
  requeteId: string,
  entiteId: string,
  agent: Agent | null,
): Promise<void> => {
  for (const etape of bp.extraEtapes) {
    const created = await tx.requeteEtape.create({
      data: {
        requeteId,
        entiteId,
        statutId: etape.statutId,
        nom: etape.nom,
        type: REQUETE_ETAPE_TYPES.MANUAL,
        createdById: agent?.id ?? null,
        clotureEffectiveDate: etape.clotureDate,
        clotureReason: etape.clotureReasonIds.length
          ? { connect: etape.clotureReasonIds.map((id) => ({ id })) }
          : undefined,
        notes: etape.notes.length
          ? { create: etape.notes.map((texte) => ({ texte, authorId: agent?.id ?? null })) }
          : undefined,
      },
      select: { id: true },
    });

    for (const file of etape.files) {
      await tx.uploadedFile.create({
        data: {
          fileName: file.fileName,
          filePath: `seed/${requeteId}/${created.id}/${file.fileName}`,
          mimeType: file.mimeType,
          size: file.size,
          status: 'COMPLETED',
          scanStatus: 'CLEAN',
          sanitizeStatus: 'COMPLETED',
          entiteId,
          uploadedById: agent?.id ?? null,
          requeteEtapeId: created.id,
        },
      });
    }
  }
};

/**
 * Writes a full request graph in a single transaction, then applies the target
 * status. This is the only module that knows the Prisma schema.
 */
export const writeRequete = async (bp: RequeteBlueprint, ctx: SeedContext): Promise<GeneratedRequete> => {
  const primaryEntiteId = bp.entiteIds[0];
  const agent = ctx.agentsByEntite.get(primaryEntiteId)?.[0] ?? null;

  // Manual requests get an agent creator; DematSocial ones look imported (no creator).
  const originData =
    bp.origin === 'MANUAL'
      ? agent
        ? { createdBy: { connect: { id: agent.id } } }
        : {}
      : { dematSocialId: ctx.faker.number.int({ min: 100_000, max: 999_999 }) };

  const id = await prisma.$transaction(async (tx) => {
    const requeteId = await generateRequeteId(tx, bp.origin, ctx.now);

    await tx.requete.create({
      data: {
        id: requeteId,
        receptionDate: bp.receptionDate,
        receptionType: { connect: { id: bp.receptionType } },
        ...originData,
        requeteEntites: {
          create: bp.entiteIds.map((entiteId) => ({
            statutId: REQUETE_STATUT_TYPES.NOUVEAU,
            entiteId,
          })),
        },
        declarant: { create: mapPersonne(bp.declarant) },
        participant: bp.participant ? { create: mapPersonne(bp.participant) } : undefined,
      },
    });

    for (const situation of bp.situations) {
      await writeSituation(tx, requeteId, situation);
    }

    for (const entiteId of bp.entiteIds) {
      await writeDefaultEtapes(tx, requeteId, entiteId);
    }
    await writeExtraEtapes(tx, bp, requeteId, primaryEntiteId, agent);

    // Apply the target status / priority on every attached entité.
    await tx.requeteEntite.updateMany({
      where: { requeteId },
      data: { statutId: bp.statutCible, prioriteId: bp.prioriteId },
    });

    return requeteId;
  });

  const entite =
    bp.entiteIds.length > 1 ? 'Partagée' : primaryEntiteId === ctx.entites.normandie.id ? 'Normandie' : 'IDF';

  return { id, familyLabel: bp.familyLabel, origin: bp.origin, statut: bp.statutCible, entite };
};
