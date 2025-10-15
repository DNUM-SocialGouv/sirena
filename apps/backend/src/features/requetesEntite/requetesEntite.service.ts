import { helpers } from '@sirena/backend-utils';
import { mappers } from '@sirena/common';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { DeclarantDataSchema, PersonneConcerneeDataSchema, SituationDataSchema } from '@sirena/common/schemas';
import type { z } from 'zod';
import { generateRequeteId } from '@/features/requetes/functionalId.service';
import { parseAdresseDomicile } from '@/helpers/address';
import { sortObject } from '@/helpers/prisma/sort';
import { createSearchConditionsForRequeteEntite } from '@/helpers/search';
import { setDemarchesEngageesFiles, setFaitFiles } from '@/features/uploadedFiles/uploadedFiles.service';
import { type Prisma, prisma } from '@/libs/prisma';
import {
  mapDeclarantToPrismaCreate,
  mapPersonneConcerneeToPrismaCreate,
  mapSituationFaitToPrismaCreate,
  mapSituationToPrismaCreate,
} from './requetesEntite.mapper';
import type { GetRequetesEntiteQuery } from './requetesEntite.type';

type DeclarantInput = z.infer<typeof DeclarantDataSchema>;
type PersonneConcerneeInput = z.infer<typeof PersonneConcerneeDataSchema>;
type SituationInput = z.infer<typeof SituationDataSchema>;

type RequeteEntiteKey = { requeteId: string; entiteId: string };

// TODO handle entiteIds
export const getRequetesEntite = async (entiteIds: string[] | null, query: GetRequetesEntiteQuery = {}) => {
  const { offset = 0, limit, sort = 'requete.createdAt', order = 'desc', search } = query;

  const searchConditions: Prisma.RequeteEntiteWhereInput = search ? createSearchConditionsForRequeteEntite(search) : {};

  const where = {
    ...searchConditions,
    ...(Array.isArray(entiteIds) && entiteIds.length > 0 ? { entiteId: { in: entiteIds } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.requeteEntite.findMany({
      where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: sortObject(sort, order),
      include: {
        requete: {
          include: {
            declarant: {
              include: {
                identite: true,
                adresse: true,
              },
            },
            participant: {
              include: {
                identite: true,
                adresse: true,
              },
            },
            situations: {
              include: {
                faits: {
                  include: {
                    consequences: true,
                    maltraitanceTypes: true,
                    motifs: true,
                  },
                },
                misEnCause: true,
                lieuDeSurvenue: true,
              },
            },
          },
        },
        requeteEtape: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.requeteEntite.count({
      where,
    }),
  ]);

  return {
    data,
    total,
  };
};

export const hasAccessToRequete = async ({ requeteId, entiteId }: RequeteEntiteKey) => {
  const requete = await prisma.requeteEntite.findUnique({
    where: { requeteId_entiteId: { requeteId, entiteId } },
    select: {
      requeteId: true,
      entiteId: true,
    },
  });

  return !!requete;
};

export const getRequeteEntiteById = async (requeteId: string, entiteIds: string[] | null) => {
  if (!entiteIds || entiteIds.length === 0) {
    return null;
  }

  return await prisma.requeteEntite.findFirst({
    where: {
      requeteId,
      entiteId: { in: entiteIds },
    },
    include: {
      requete: {
        include: {
          declarant: {
            include: {
              identite: {
                include: {
                  civilite: true,
                },
              },
              adresse: true,
              lienVictime: true,
            },
          },
          participant: {
            include: {
              adresse: true,
              age: true,
              identite: true,
              lienVictime: true,
              participantDe: true,
            },
          },
          fichiersRequeteOriginale: true,
          situations: {
            include: {
              lieuDeSurvenue: {
                include: { adresse: true, lieuType: true, transportType: true },
              },
              misEnCause: {
                include: {
                  misEnCauseType: true,
                  professionType: true,
                  professionDomicileType: true,
                },
              },
              faits: {
                include: {
                  motifs: { include: { motif: true } },
                  consequences: { include: { consequence: true } },
                  maltraitanceTypes: { include: { maltraitanceType: true } },
                },
              },
              demarchesEngagees: {
                include: {
                  demarches: true,
                  autoriteType: true,
                },
              },
            },
          },
        },
      },
      requeteEtape: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
};

interface CreateRequeteInput {
  declarant?: DeclarantInput;
  participant?: PersonneConcerneeInput;
}

export const createRequeteEntite = async (entiteIds: string[] | null, data?: CreateRequeteInput) => {
  const entiteId = entiteIds?.[0];
  if (!entiteId) {
    throw new Error('No entity ID provided');
  }

  const maxRetries = 5;
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < maxRetries) {
    try {
      const requeteId = await generateRequeteId('SIRENA');

      const requete = await prisma.requete.create({
        data: {
          id: requeteId,
          receptionDate: new Date(),
          receptionTypeId: 'EMAIL',
          ...(data?.declarant && {
            declarant: {
              create: mapDeclarantToPrismaCreate(data.declarant),
            },
          }),
          ...(data?.participant && {
            participant: {
              create: mapPersonneConcerneeToPrismaCreate(data.participant),
            },
          }),
          requeteEntites: {
            create: {
              entiteId,
            },
          },
        },
        include: {
          requeteEntites: true,
          declarant: data?.declarant
            ? {
                include: {
                  identite: true,
                  adresse: true,
                },
              }
            : false,
          participant: data?.participant
            ? {
                include: {
                  identite: true,
                  adresse: true,
                },
              }
            : false,
        },
      });

      // Create default processing steps for each entity
      for (const entite of requete.requeteEntites) {
        await prisma.requeteEtape.create({
          data: {
            requeteId: requete.id,
            entiteId: entite.entiteId,
            statutId: REQUETE_STATUT_TYPES.FAIT,
            nom: `Création de la requête le ${
              requete.receptionDate?.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }) ||
              new Date().toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            }`,
          },
        });

        await prisma.requeteEtape.create({
          data: {
            requeteId: requete.id,
            entiteId: entite.entiteId,
            statutId: REQUETE_STATUT_TYPES.A_FAIRE,
            nom: 'Envoyer un accusé de réception au déclarant',
          },
        });
      }

      return requete;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string; meta?: { target?: string[] }; message?: string };
        if (prismaError.code === 'P2002' && prismaError.meta?.target?.includes('id')) {
          lastError = new Error(prismaError.message || 'Unique constraint failed on id');
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error(`Failed to create requete after ${maxRetries} retries. Last error: ${lastError?.message}`);
};

interface UpdateRequeteInput {
  declarant?: DeclarantInput;
}

interface UpdateRequeteControls {
  declarant?: { updatedAt?: string };
  participant?: { updatedAt?: string };
}

export const updateRequete = async (requeteId: string, data: UpdateRequeteInput, controls?: UpdateRequeteControls) => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    include: {
      declarant: {
        include: {
          identite: true,
          adresse: true,
        },
      },
    },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  if (data.declarant) {
    if (controls?.declarant?.updatedAt && requete.declarant?.identite) {
      const clientUpdatedAt = new Date(controls.declarant.updatedAt);
      const serverUpdatedAt = requete.declarant.identite.updatedAt;

      if (clientUpdatedAt.getTime() !== serverUpdatedAt.getTime()) {
        helpers.throwHTTPException409Conflict('The declarant identity has been modified by another user.', {
          cause: {
            serverData: requete.declarant,
            serverUpdatedAt: serverUpdatedAt.toISOString(),
          },
        });
      }
    }

    const declarantData = data.declarant;
    const lienVictimeValue =
      declarantData.lienAvecPersonneConcernee &&
      declarantData.lienAvecPersonneConcernee !== '' &&
      declarantData.lienAvecPersonneConcernee !== 'AUTRE'
        ? declarantData.lienAvecPersonneConcernee
        : null;

    const lienAutrePrecisionValue = declarantData.lienAvecPersonneConcerneePrecision || undefined;

    const includeDeclarant = {
      include: {
        identite: true,
        adresse: true,
        lienVictime: true,
      },
    };

    if (requete.declarant) {
      return await prisma.requete.update({
        where: { id: requeteId },
        data: {
          declarant: {
            update: {
              estIdentifie: true,
              veutGarderAnonymat: declarantData.neSouhaitePasCommuniquerIdentite || false,
              estVictime: declarantData.estPersonneConcernee || false,
              commentaire: declarantData.autresPrecisions || '',
              lienVictimeId: lienVictimeValue,
              lienAutrePrecision: lienAutrePrecisionValue,
              updatedAt: new Date(),
              identite: {
                update: {
                  nom: declarantData.nom || '',
                  prenom: declarantData.prenom || '',
                  email: declarantData.courrierElectronique || '',
                  telephone: declarantData.numeroTelephone || '',
                  civiliteId: mappers.mapCiviliteToDatabase(declarantData.civilite),
                },
              },
              adresse:
                declarantData.adresseDomicile || declarantData.codePostal || declarantData.ville
                  ? {
                      upsert: {
                        create: (() => {
                          const { numero, rue } = parseAdresseDomicile(declarantData.adresseDomicile || '');
                          return {
                            label:
                              `${declarantData.adresseDomicile || ''} ${declarantData.codePostal || ''} ${declarantData.ville || ''}` ||
                              '',
                            numero,
                            rue,
                            codePostal: declarantData.codePostal || '',
                            ville: declarantData.ville || '',
                          };
                        })(),
                        update: (() => {
                          const { numero, rue } = parseAdresseDomicile(declarantData.adresseDomicile || '');
                          return {
                            label:
                              `${declarantData.adresseDomicile || ''} ${declarantData.codePostal || ''} ${declarantData.ville || ''}` ||
                              '',
                            numero,
                            rue,
                            codePostal: declarantData.codePostal || '',
                            ville: declarantData.ville || '',
                          };
                        })(),
                      },
                    }
                  : undefined,
            },
          },
        },
        include: {
          declarant: includeDeclarant,
        },
      });
    }

    return await prisma.requete.update({
      where: { id: requeteId },
      data: {
        declarant: {
          create: mapDeclarantToPrismaCreate(declarantData),
        },
      },
      include: {
        declarant: includeDeclarant,
      },
    });
  }

  return requete;
};

export const updateRequeteDeclarant = async (
  requeteId: string,
  declarantData: DeclarantInput,
  controls?: UpdateRequeteControls,
) => {
  return updateRequete(requeteId, { declarant: declarantData }, controls);
};

export const updateRequeteParticipant = async (
  requeteId: string,
  participantData: PersonneConcerneeInput,
  controls?: UpdateRequeteControls,
) => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    include: {
      participant: {
        include: {
          identite: true,
          adresse: true,
        },
      },
    },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  if (controls?.participant?.updatedAt && requete.participant?.identite) {
    const clientUpdatedAt = new Date(controls.participant.updatedAt);
    const serverUpdatedAt = requete.participant.identite.updatedAt;

    if (clientUpdatedAt.getTime() !== serverUpdatedAt.getTime()) {
      const error = new Error('CONFLICT: The participant identity has been modified by another user.');
      (error as Error & { conflictData?: unknown }).conflictData = {
        serverData: requete.participant,
        serverUpdatedAt: serverUpdatedAt.toISOString(),
      };
      throw error;
    }
  }

  const includeParticipant = {
    include: {
      identite: true,
      adresse: true,
    },
  };

  if (requete.participant) {
    return await prisma.requete.update({
      where: { id: requeteId },
      data: {
        participant: {
          update: {
            estHandicapee: participantData.estHandicapee || false,
            veutGarderAnonymat: participantData.veutGarderAnonymat || false,
            estVictimeInformee: participantData.estVictimeInformee || false,
            autrePersonnes: participantData.autrePersonnes || '',
            commentaire: participantData.commentaire || '',
            ageId: participantData.age || undefined,
            updatedAt: new Date(),
            identite: {
              update: {
                nom: participantData.nom || '',
                prenom: participantData.prenom || '',
                email: participantData.courrierElectronique || '',
                telephone: participantData.numeroTelephone || '',
                civiliteId: mappers.mapCiviliteToDatabase(participantData.civilite),
              },
            },
            adresse:
              participantData.adresseDomicile || participantData.codePostal || participantData.ville
                ? {
                    upsert: {
                      create: (() => {
                        const { numero, rue } = parseAdresseDomicile(participantData.adresseDomicile || '');
                        return {
                          label:
                            `${participantData.adresseDomicile || ''} ${participantData.codePostal || ''} ${participantData.ville || ''}` ||
                            '',
                          numero,
                          rue,
                          codePostal: participantData.codePostal || '',
                          ville: participantData.ville || '',
                        };
                      })(),
                      update: (() => {
                        const { numero, rue } = parseAdresseDomicile(participantData.adresseDomicile || '');
                        return {
                          label:
                            `${participantData.adresseDomicile || ''} ${participantData.codePostal || ''} ${participantData.ville || ''}` ||
                            '',
                          numero,
                          rue,
                          codePostal: participantData.codePostal || '',
                          ville: participantData.ville || '',
                        };
                      })(),
                    },
                  }
                : undefined,
          },
        },
      },
      include: {
        participant: includeParticipant,
      },
    });
  }

  return await prisma.requete.update({
    where: { id: requeteId },
    data: {
      participant: {
        create: mapPersonneConcerneeToPrismaCreate(participantData),
      },
    },
    include: {
      participant: includeParticipant,
    },
  });
};

export const updateRequeteSituation = async (requeteId: string, situationData: SituationInput) => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    include: {
      situations: {
        include: {
          lieuDeSurvenue: {
            include: { adresse: true },
          },
          misEnCause: true,
          faits: true,
          demarchesEngagees: {
            include: {
              demarches: true,
            },
          },
        },
      },
    },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    if (requete.situations.length > 0) {
      const [existingSituation] = requete.situations;
      const lieuData = situationData.lieuDeSurvenue;
      const misEnCauseData = situationData.misEnCause;
      const faitData = situationData.fait;
      const demarchesData = situationData.demarchesEngagees;

      await tx.situation.update({
        where: { id: existingSituation.id },
        data: {
          lieuDeSurvenue: {
            update: {
              lieuTypeId: lieuData?.lieuType || null,
              codePostal: lieuData?.codePostal || '',
              societeTransport: lieuData?.societeTransport || '',
              finess: lieuData?.finess || '',
              commentaire: lieuData?.commentaire || '',
              transportTypeId: lieuData?.transportType || null,
              adresse:
                lieuData?.adresse || lieuData?.numero || lieuData?.rue || lieuData?.codePostal || lieuData?.ville
                  ? {
                      upsert: {
                        create: {
                          label: lieuData?.adresse || '',
                          numero: lieuData?.numero || '',
                          rue: lieuData?.rue || '',
                          codePostal: lieuData?.codePostal || '',
                          ville: lieuData?.ville || '',
                        },
                        update: {
                          label: lieuData?.adresse || '',
                          numero: lieuData?.numero || '',
                          rue: lieuData?.rue || '',
                          codePostal: lieuData?.codePostal || '',
                          ville: lieuData?.ville || '',
                        },
                      },
                    }
                  : undefined,
            },
          },
          misEnCause: {
            update: {
              misEnCauseTypeId: misEnCauseData?.misEnCauseType || null,
              professionTypeId: misEnCauseData?.professionType || null,
              professionDomicileTypeId: misEnCauseData?.professionDomicileType || null,
              rpps: misEnCauseData?.rpps || null,
              commentaire: misEnCauseData?.commentaire || '',
            },
          },
          demarchesEngagees: {
            update: {
              dateContactEtablissement: demarchesData?.dateContactEtablissement
                ? new Date(demarchesData.dateContactEtablissement)
                : null,
              etablissementARepondu: demarchesData?.etablissementARepondu ?? null,
              organisme: demarchesData?.organisme || '',
              datePlainte: demarchesData?.datePlainte ? new Date(demarchesData.datePlainte) : null,
              commentaire: demarchesData?.commentaire || '',
              autoriteTypeId: demarchesData?.autoriteType || null,
              demarches: demarchesData?.demarches?.length
                ? {
                    set: demarchesData.demarches.map((demarcheId) => ({ id: demarcheId })),
                  }
                : { set: [] },
            },
          },
        },
      });

      const [existingFait] = existingSituation.faits;
      if (existingFait) {
        await tx.faitMotif.deleteMany({
          where: { situationId: existingSituation.id },
        });
        await tx.faitConsequence.deleteMany({
          where: { situationId: existingSituation.id },
        });
        await tx.faitMaltraitanceType.deleteMany({
          where: { situationId: existingSituation.id },
        });

        await tx.fait.update({
          where: { situationId: existingSituation.id },
          data: {
            dateDebut: faitData?.dateDebut ? new Date(faitData.dateDebut) : null,
            dateFin: faitData?.dateFin ? new Date(faitData.dateFin) : null,
            commentaire: faitData?.commentaire || '',
          },
        });

        if (faitData?.sousMotifs?.length) {
          for (const sousMotifLabel of faitData.sousMotifs) {
            const motif = await tx.motifEnum.upsert({
              where: { label: sousMotifLabel },
              create: { label: sousMotifLabel },
              update: {},
            });

            await tx.faitMotif.create({
              data: {
                situationId: existingSituation.id,
                motifId: motif.id,
              },
            });
          }
        }

        if (faitData?.consequences?.length) {
          await tx.faitConsequence.createMany({
            data: faitData.consequences.map((consequenceId) => ({
              situationId: existingSituation.id,
              consequenceId,
            })),
          });
        }

        if (faitData?.maltraitanceTypes?.length) {
          await tx.faitMaltraitanceType.createMany({
            data: faitData.maltraitanceTypes.map((maltraitanceTypeId) => ({
              situationId: existingSituation.id,
              maltraitanceTypeId,
            })),
          });
        }
      } else if (faitData) {
        const faitCreateData = mapSituationFaitToPrismaCreate(existingSituation.id, faitData);
        if (faitCreateData) {
          await tx.fait.create({
            data: faitCreateData,
          });
        }
      }
    } else {
      const situationCreateData = mapSituationToPrismaCreate(situationData);
      const createdSituation = await tx.situation.create({
        data: {
          ...situationCreateData,
          requete: {
            connect: { id: requeteId },
          },
        },
      });

      if (situationData.fait) {
        const faitCreateData = mapSituationFaitToPrismaCreate(createdSituation.id, situationData.fait);
        if (faitCreateData) {
          await tx.fait.create({
            data: faitCreateData,
          });
        }
      }
    }

    return tx.requete.findUnique({
      where: { id: requeteId },
      include: {
        situations: {
          include: {
            lieuDeSurvenue: {
              include: { adresse: true, lieuType: true, transportType: true },
            },
            misEnCause: {
              include: {
                misEnCauseType: true,
                professionType: true,
                professionDomicileType: true,
              },
            },
            faits: {
              include: {
                motifs: { include: { motif: true } },
                consequences: { include: { consequence: true } },
                maltraitanceTypes: { include: { maltraitanceType: true } },
              },
            },
            demarchesEngagees: {
              include: {
                demarches: true,
                autoriteType: true,
              },
            },
          },
        },
      },
    });
  });

  if (result?.situations?.[0]) {
    const [situation] = result.situations;

    if (situationData.fait?.fileIds?.length && situation.faits?.[0]) {
      await setFaitFiles(situation.id, situationData.fait.fileIds, null);
    }

    if (situationData.demarchesEngagees?.fileIds?.length && situation.demarchesEngagees) {
      await setDemarchesEngageesFiles(situation.demarchesEngagees.id, situationData.demarchesEngagees.fileIds, null);
    }
  }

  return result;
};
