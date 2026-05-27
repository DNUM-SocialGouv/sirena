import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { SituationDataSchema } from '@sirena/common/schemas';
import { prisma } from '@sirena/db';
import type { SirenaRequeteData } from './transformers/sirecMigration.transformer.js';

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
    const demarchesEngagees = await tx.demarchesEngagees.create({
      data: {
        demarches: { connect: data.situation.demarchesIds.map((id) => ({ id })) },
      },
      select: { id: true },
    });

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
        commentaire: data.situation.fait.commentaire,
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

    await tx.requeteEtape.createMany({
      data: data.provenances.map(({ nom, entiteId }) => ({
        requeteId: requete.id,
        entiteId,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        nom: `Réception à l'institution de provenance : ${nom}`,
      })),
    });

    await tx.situationEntite.createMany({
      data: data.situation.entiteIds.map((entiteId) => ({
        situationId: situation.id,
        entiteId,
      })),
    });

    if (data.declarant !== null && !data.declarant.estVictime) {
      await tx.personneConcernee.create({
        data: {
          declarantDeId: requete.id,
          estVictime: data.declarant.estVictime,
          veutGarderAnonymat: data.declarant.veutGarderAnonymat,
          lienVictimeId: data.declarant.lienVictimeId,
          lienAutrePrecision: data.declarant.lienAutrePrecision,
          commentaire: data.declarant.commentaire,
          ...(data.declarant.adresse !== null
            ? {
                adresse: {
                  create: {
                    rue: data.declarant.adresse.rue ?? '',
                    codePostal: data.declarant.adresse.codePostal ?? '',
                    ville: data.declarant.adresse.ville ?? '',
                  },
                },
              }
            : {}),
          ...(data.declarant.identite !== null
            ? {
                identite: {
                  create: {
                    nom: data.declarant.identite.nom ?? '',
                    prenom: data.declarant.identite.prenom ?? '',
                    email: data.declarant.identite.email ?? '',
                    telephone: data.declarant.identite.telephone ?? '',
                    civiliteId: data.declarant.identite.civiliteId,
                  },
                },
              }
            : {}),
        },
      });
    }

    if (data.victime !== null || data.declarant?.estVictime) {
      await tx.personneConcernee.create({
        data: {
          participantDeId: requete.id,
          estVictime: true,
          commentaire: data.victime?.commentaire ?? '',
          ageId: data.victime?.ageId ?? null,
          ...(data.declarant?.estVictime && { declarantDeId: requete.id }),
          ...(data.victime?.adresse !== null && data.victime?.adresse !== undefined
            ? {
                adresse: {
                  create: {
                    rue: data.victime.adresse.rue ?? '',
                    codePostal: data.victime.adresse.codePostal ?? '',
                    ville: data.victime.adresse.ville ?? '',
                  },
                },
              }
            : {}),
          ...(data.victime?.identite !== null && data.victime?.identite !== undefined
            ? {
                identite: {
                  create: {
                    nom: data.victime.identite.nom ?? '',
                    prenom: data.victime.identite.prenom ?? '',
                    email: data.victime.identite.email ?? '',
                    telephone: data.victime.identite.telephone ?? '',
                    civiliteId: data.victime.identite.civiliteId,
                  },
                },
              }
            : {}),
        },
      });
    }

    return requete.id;
  });
}
