import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { SituationDataSchema } from '@sirena/common/schemas';
import { prisma } from '@sirena/db';
import type { SirenaRequeteData } from './sirecMigration.transformer.js';

export async function getRequeteIdFromSirecId(sirecId: number): Promise<string | null> {
  const requete = await prisma.requete.findFirst({
    where: { sirecId },
    select: { id: true },
  });
  return requete ? requete.id : null;
}

export async function saveFromSirec(data: SirenaRequeteData): Promise<string> {
  SituationDataSchema.parse(data.situation);

  return prisma.$transaction(async (tx) => {
    const requete = await tx.requete.create({
      data: {
        id: data.sirenaId,
        sirecId: data.sirecId,
        receptionDate: data.receptionDate,
        receptionTypeId: data.receptionTypeId,
      },
      select: { id: true },
    });

    const lieu = await tx.lieuDeSurvenue.create({ data: {}, select: { id: true } });
    const misEnCause = await tx.misEnCause.create({ data: {}, select: { id: true } });
    const demarchesEngagees = await tx.demarchesEngagees.create({ data: {}, select: { id: true } });

    const situation = await tx.situation.create({
      data: {
        lieuDeSurvenueId: lieu.id,
        misEnCauseId: misEnCause.id,
        demarchesEngageesId: demarchesEngagees.id,
        requeteId: requete.id,
      },
      select: { id: true },
    });

    await tx.fait.create({
      data: {
        situationId: situation.id,
        autresPrecisions: data.situation.fait.autresPrecisions,
      },
    });

    await tx.faitMotifDeclaratif.createMany({
      data: data.situation.fait.motifsDeclaratifs.map((motifDeclaratifId) => ({
        situationId: situation.id,
        motifDeclaratifId,
      })),
    });

    await tx.requeteEntite.createMany({
      data: data.requeteEntiteIds.map((entiteId) => ({
        requeteId: requete.id,
        entiteId,
        // TODO: mapper l'état SIREC vers statutId
        statutId: REQUETE_STATUT_TYPES.EN_COURS,
        prioriteId: data.prioriteId,
      })),
    });

    await tx.situationEntite.createMany({
      data: data.situation.entiteIds.map((entiteId) => ({
        situationId: situation.id,
        entiteId,
      })),
    });

    return requete.id;
  });
}
