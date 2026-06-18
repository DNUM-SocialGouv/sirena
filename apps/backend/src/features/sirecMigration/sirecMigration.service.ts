import { SituationDataSchema } from '@sirena/common/schemas';
import { prisma, type Requete } from '@sirena/db';
import { UnrecoverableError } from 'bullmq';
import { isPrismaUniqueConstraintError } from '../../helpers/prisma.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import type { SirenaRequeteData } from './transformers/sirecMigration.transformer.js';

export async function getRequeteIdFromSirecId(sirecId: number): Promise<string | null> {
  const requete = await prisma.requete.findFirst({
    where: { sirecId },
    select: { id: true },
  });
  return requete ? requete.id : null;
}

export async function saveFromSirec(data: SirenaRequeteData): Promise<string> {
  const logger = getLoggerStore();
  for (const situation of data.situations) {
    SituationDataSchema.parse(situation);
  }

  return prisma.$transaction(async (tx) => {
    let sirenaRequete: Pick<Requete, 'id'>;
    try {
      sirenaRequete = await tx.requete.create({
        data: {
          id: data.sirenaId,
          sirecId: data.sirecId,
          receptionDate: data.receptionDate,
          receptionTypeId: data.receptionTypeId,
          dateDemandeDeclarant: data.dateDemandeDeclarant,
        },
        select: { id: true },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        logger.info({ err: error }, `Sirec record already exists, skipping SIREC import : ${data.sirecId}`);
        throw new UnrecoverableError(`Sirec record already exists, skipping SIREC import : ${data.sirecId}`);
      }
      throw error;
    }

    for (const situationData of data.situations) {
      let misEnCauseId: string;

      if (situationData.misEnCauseData !== null) {
        const mec = situationData.misEnCauseData;
        if (mec.kind === 'rpps') {
          const created = await tx.misEnCause.create({
            data: {
              rpps: mec.rpps,
              civilite: mec.civilite,
              nom: mec.nom,
              prenom: mec.prenom,
              codePostal: mec.codePostal,
              ville: mec.ville,
              misEnCauseTypeId: mec.misEnCauseTypeId,
              misEnCauseTypePrecisionId: mec.misEnCauseTypePrecisionId,
              ...(mec.autrePrecision ? { autrePrecision: mec.autrePrecision } : {}),
            },
            select: { id: true },
          });
          misEnCauseId = created.id;
        } else if (mec.kind === 'finess') {
          const created = await tx.misEnCause.create({
            data: {
              finess: mec.finess,
              misEnCauseTypeId: mec.misEnCauseTypeId,
              misEnCauseTypePrecisionId: mec.misEnCauseTypePrecisionId,
              nomService: mec.nomService,
              codePostal: mec.codePostal,
              ville: mec.ville,
              ...(mec.autrePrecision ? { autrePrecision: mec.autrePrecision } : {}),
            },
            select: { id: true },
          });
          misEnCauseId = created.id;
        } else {
          const created = await tx.misEnCause.create({
            data: {
              misEnCauseTypeId: mec.misEnCauseTypeId ?? undefined,
              misEnCauseTypePrecisionId: mec.misEnCauseTypePrecisionId ?? undefined,
              autrePrecision: mec.autrePrecision,
            },
            select: { id: true },
          });
          misEnCauseId = created.id;
        }
      } else {
        const created = await tx.misEnCause.create({ data: {}, select: { id: true } });
        misEnCauseId = created.id;
      }

      let lieuId: string;
      if (situationData.lieuDeSurvenueData !== null) {
        const lsd = situationData.lieuDeSurvenueData;
        const created = await tx.lieuDeSurvenue.create({
          data: {
            finess: lsd.finess,
            codePostal: lsd.codePostal,
            categCode: lsd.categCode,
            categLib: lsd.categLib,
            lieuTypeId: lsd.lieuTypeId,
            lieuPrecision: lsd.lieuPrecision,
            adresse: {
              create: {
                label: lsd.adresse.label,
                numero: lsd.adresse.numero,
                rue: lsd.adresse.rue,
                codePostal: lsd.adresse.codePostal,
                ville: lsd.adresse.ville,
              },
            },
          },
          select: { id: true },
        });
        lieuId = created.id;
      } else {
        const created = await tx.lieuDeSurvenue.create({ data: {}, select: { id: true } });
        lieuId = created.id;
      }

      const demarchesEngagees = await tx.demarchesEngagees.create({
        data: {
          demarches: { connect: situationData.demarchesIds.map((id) => ({ id })) },
        },
        select: { id: true },
      });

      const situation = await tx.situation.create({
        data: {
          lieuDeSurvenueId: lieuId,
          misEnCauseId,
          demarchesEngageesId: demarchesEngagees.id,
          requeteId: sirenaRequete.id,
        },
        select: { id: true },
      });

      await tx.fait.create({
        data: {
          situationId: situation.id,
          commentaire: situationData.fait.commentaire,
          autresPrecisions: situationData.fait.autresPrecisions,
        },
      });

      await tx.faitMotifDeclaratif.createMany({
        data: situationData.fait.motifsDeclaratifs.map((motifDeclaratifId) => ({
          situationId: situation.id,
          motifDeclaratifId,
        })),
      });

      await tx.situationEntite.createMany({
        data: situationData.entiteIds.map((entiteId) => ({
          situationId: situation.id,
          entiteId,
        })),
      });
    }

    await tx.requeteEntite.createMany({
      data: data.requeteEntiteIds.map((entiteId) => ({
        requeteId: sirenaRequete.id,
        entiteId,
        statutId: data.requeteStatutId,
        prioriteId: data.prioriteId,
      })),
    });

    for (const { nom, entiteId, statutId, createdAt, note, clotureReason, clotureEffectiveDate } of data.etapes) {
      const etapeCreatedAt = createdAt ?? data.sysLastModDate ?? undefined;
      await tx.requeteEtape.create({
        data: {
          requeteId: sirenaRequete.id,
          entiteId,
          statutId,
          nom,
          ...(etapeCreatedAt !== undefined ? { createdAt: etapeCreatedAt } : {}),
          ...(note !== null
            ? {
                notes: {
                  create: [{ texte: note, ...(etapeCreatedAt !== undefined ? { createdAt: etapeCreatedAt } : {}) }],
                },
              }
            : {}),
          ...(clotureReason !== undefined ? { clotureReason: { connect: [{ id: clotureReason }] } } : {}),
          ...(clotureEffectiveDate !== undefined ? { clotureEffectiveDate } : {}),
        },
      });
    }

    if (data.declarant !== null && !data.declarant.estVictime) {
      await tx.personneConcernee.create({
        data: {
          declarantDeId: sirenaRequete.id,
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
          participantDeId: sirenaRequete.id,
          estVictime: true,
          commentaire: data.victime?.commentaire ?? '',
          ageId: data.victime?.ageId ?? null,
          ...(data.declarant?.estVictime && { declarantDeId: sirenaRequete.id }),
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
    return sirenaRequete?.id;
  });
}
