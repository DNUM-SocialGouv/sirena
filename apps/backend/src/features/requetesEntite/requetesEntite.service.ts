import { helpers } from '@sirena/backend-utils';
import { mappers } from '@sirena/common';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { DeclarantDataSchema, PersonneConcerneeDataSchema, SituationDataSchema } from '@sirena/common/schemas';
import type { z } from 'zod';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { generateRequeteId } from '@/features/requetes/functionalId.service';
import { setDemarchesEngageesFiles, setFaitFiles } from '@/features/uploadedFiles/uploadedFiles.service';
import { parseAdresseDomicile } from '@/helpers/address';
import { sortObject } from '@/helpers/prisma/sort';
import { createSearchConditionsForRequeteEntite } from '@/helpers/search';
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

const toNullableId = (value: string | undefined | null): string | null => {
  if (!value || value === '') return null;
  return value;
};

const cleanNullOrEmpty = <T>(value: T | undefined | null): T | '' => {
  return value || ('' as T | '');
};

const parseNullableDate = (dateString: string | undefined | null): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

const SITUATION_INCLUDE_BASE = {
  lieuDeSurvenue: {
    include: { adresse: true },
  },
  misEnCause: true,
  faits: true,
  demarchesEngagees: {
    include: {
      demarches: true,
      etablissementReponse: true,
    },
  },
};

const SITUATION_INCLUDE_FULL = {
  lieuDeSurvenue: {
    include: { adresse: true, lieuType: true, transportType: true },
  },
  misEnCause: {
    include: {
      misEnCauseType: true,
      misEnCauseTypePrecision: {
        include: {
          misEnCauseType: true,
        },
      },
    },
  },
  faits: {
    include: {
      motifs: { include: { motif: true } },
      consequences: { include: { consequence: true } },
      maltraitanceTypes: { include: { maltraitanceType: true } },
      fichiers: true,
    },
  },
  demarchesEngagees: {
    include: {
      demarches: true,
      autoriteType: true,
      etablissementReponse: true,
    },
  },
};

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
                    motifs: {
                      include: {
                        motif: true,
                      },
                    },
                    fichiers: true,
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
                  misEnCauseTypePrecision: {
                    include: {
                      misEnCauseType: true,
                    },
                  },
                },
              },
              faits: {
                include: {
                  motifs: { include: { motif: true } },
                  consequences: { include: { consequence: true } },
                  maltraitanceTypes: { include: { maltraitanceType: true } },
                  fichiers: true,
                },
              },
              demarchesEngagees: {
                include: {
                  demarches: true,
                  autoriteType: true,
                  etablissementReponse: true,
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

// Helper function to create changelog for RequeteEtape
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

export const createRequeteEntite = async (
  entiteIds: string[] | null,
  data?: CreateRequeteInput,
  changedById?: string,
) => {
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
        const etape1 = await prisma.requeteEtape.create({
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

        const etape2 = await prisma.requeteEtape.create({
          data: {
            requeteId: requete.id,
            entiteId: entite.entiteId,
            statutId: REQUETE_STATUT_TYPES.A_FAIRE,
            nom: 'Envoyer un accusé de réception au déclarant',
          },
        });

        // Create changelogs for the created steps if changedById is provided
        if (changedById) {
          await createRequeteEtapeChangelog(
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
            changedById,
          );

          await createRequeteEtapeChangelog(
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
            changedById,
          );
        }
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

const buildLieuDeSurvenueUpdate = (lieuData: SituationInput['lieuDeSurvenue']) => {
  if (!lieuData) return {};

  const hasAdresseData = lieuData.adresse || lieuData.codePostal;

  return {
    lieuTypeId: toNullableId(lieuData.lieuType),
    lieuPrecision: cleanNullOrEmpty(lieuData.lieuPrecision),
    codePostal: cleanNullOrEmpty(lieuData.codePostal),
    societeTransport: cleanNullOrEmpty(lieuData.societeTransport),
    finess: cleanNullOrEmpty(lieuData.finess),
    adresse: hasAdresseData
      ? {
          upsert: {
            create: {
              label: cleanNullOrEmpty(lieuData.adresse),
              codePostal: cleanNullOrEmpty(lieuData.codePostal),
            },
            update: {
              label: cleanNullOrEmpty(lieuData.adresse),
              codePostal: cleanNullOrEmpty(lieuData.codePostal),
            },
          },
        }
      : undefined,
  };
};

const buildMisEnCauseUpdate = (misEnCauseData: SituationInput['misEnCause']) => {
  if (!misEnCauseData) return {};

  return {
    misEnCauseTypeId: toNullableId(misEnCauseData.misEnCauseType),
    misEnCauseTypePrecisionId: toNullableId(misEnCauseData.misEnCausePrecision),
    rpps: misEnCauseData.rpps || null,
    commentaire: cleanNullOrEmpty(misEnCauseData.commentaire),
  };
};

const buildDemarchesEngageesUpdate = (demarchesData: SituationInput['demarchesEngagees']) => {
  if (!demarchesData) return {};

  return {
    dateContactEtablissement: parseNullableDate(demarchesData.dateContactResponsables),
    etablissementARepondu: demarchesData.reponseRecueResponsables ?? null,
    organisme: cleanNullOrEmpty(demarchesData.precisionsOrganisme),
    datePlainte: parseNullableDate(demarchesData.dateDepotPlainte),
    autoriteTypeId: toNullableId(demarchesData.lieuDepotPlainte),
    demarches: demarchesData.demarches?.length
      ? { set: demarchesData.demarches.map((demarcheId) => ({ id: demarcheId })) }
      : { set: [] },
  };
};

const updateFaitRelations = async (
  tx: Prisma.TransactionClient,
  situationId: string,
  faitData: SituationInput['fait'],
) => {
  if (!faitData) return;

  await Promise.all([
    tx.faitMotif.deleteMany({ where: { situationId } }),
    tx.faitConsequence.deleteMany({ where: { situationId } }),
    tx.faitMaltraitanceType.deleteMany({ where: { situationId } }),
  ]);

  await tx.fait.update({
    where: { situationId },
    data: {
      dateDebut: parseNullableDate(faitData.dateDebut),
      dateFin: parseNullableDate(faitData.dateFin),
      commentaire: cleanNullOrEmpty(faitData.commentaire),
      autresPrecisions: cleanNullOrEmpty(faitData.autresPrecisions),
    },
  });

  if (faitData.sousMotifs?.length) {
    for (const sousMotifLabel of faitData.sousMotifs) {
      const motif = await tx.motifEnum.upsert({
        where: { label: sousMotifLabel },
        create: { label: sousMotifLabel },
        update: {},
      });

      await tx.faitMotif.create({
        data: { situationId, motifId: motif.id },
      });
    }
  }

  const relationCreates = [];
  if (faitData.consequences?.length) {
    relationCreates.push(
      tx.faitConsequence.createMany({
        data: faitData.consequences.map((consequenceId) => ({ situationId, consequenceId })),
      }),
    );
  }

  if (relationCreates.length > 0) {
    await Promise.all(relationCreates);
  }
};

const updateExistingSituation = async (
  tx: Prisma.TransactionClient,
  existingSituation: { id: string; faits: unknown[] },
  situationData: SituationInput,
) => {
  await tx.situation.update({
    where: { id: existingSituation.id },
    data: {
      lieuDeSurvenue: { update: buildLieuDeSurvenueUpdate(situationData.lieuDeSurvenue) },
      misEnCause: { update: buildMisEnCauseUpdate(situationData.misEnCause) },
      demarchesEngagees: { update: buildDemarchesEngageesUpdate(situationData.demarchesEngagees) },
    },
  });

  const [existingFait] = existingSituation.faits;
  if (existingFait) {
    await updateFaitRelations(tx, existingSituation.id, situationData.fait);
  } else if (situationData.fait) {
    const faitCreateData = mapSituationFaitToPrismaCreate(existingSituation.id, situationData.fait);
    if (faitCreateData) {
      await tx.fait.create({ data: faitCreateData });
    }
  }
};

const createNewSituation = async (
  tx: Prisma.TransactionClient,
  requeteId: string,
  situationData: SituationInput,
): Promise<{ id: string }> => {
  const situationCreateData = mapSituationToPrismaCreate(situationData);
  const createdSituation = await tx.situation.create({
    data: {
      ...situationCreateData,
      requete: { connect: { id: requeteId } },
    },
  });

  if (situationData.fait) {
    const faitCreateData = mapSituationFaitToPrismaCreate(createdSituation.id, situationData.fait);
    if (faitCreateData) {
      await tx.fait.create({ data: faitCreateData });
    }
  }

  return createdSituation;
};

export const createRequeteSituation = async (requeteId: string, situationData: SituationInput) => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  let createdSituationId: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const newSituation = await createNewSituation(tx, requeteId, situationData);
    createdSituationId = newSituation.id;

    return tx.requete.findUnique({
      where: { id: requeteId },
      include: { situations: { include: SITUATION_INCLUDE_FULL } },
    });
  });

  if (result?.situations && createdSituationId) {
    const situation = result.situations.find((s) => s.id === createdSituationId);

    if (situation) {
      if (situationData.fait?.fileIds?.length) {
        await setFaitFiles(situation.id, situationData.fait.fileIds, null);
      }
    }
  }

  return prisma.requete.findUnique({
    where: { id: requeteId },
    include: { situations: { include: SITUATION_INCLUDE_FULL } },
  });
};

export const updateRequeteSituation = async (requeteId: string, situationId: string, situationData: SituationInput) => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    include: { situations: { include: SITUATION_INCLUDE_BASE } },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingSituation = requete.situations.find((s) => s.id === situationId);
    if (!existingSituation) {
      throw new Error('Situation not found');
    }
    await updateExistingSituation(tx, existingSituation, situationData);

    return tx.requete.findUnique({
      where: { id: requeteId },
      include: { situations: { include: SITUATION_INCLUDE_FULL } },
    });
  });

  if (result?.situations) {
    const situation = result.situations.find((s) => s.id === situationId);

    if (situation) {
      if (situationData.fait?.fileIds?.length) {
        await setFaitFiles(situation.id, situationData.fait.fileIds, null);
      }
    }
  }

  return prisma.requete.findUnique({
    where: { id: requeteId },
    include: { situations: { include: SITUATION_INCLUDE_FULL } },
  });
};

export const closeRequeteForEntite = async (
  requeteId: string,
  entiteId: string,
  reasonId: string,
  authorId: string,
  precision?: string,
  fileIds?: string[],
) => {
  const requeteEntite = await prisma.requeteEntite.findUnique({
    where: {
      requeteId_entiteId: {
        requeteId,
        entiteId,
      },
    },
    include: {
      requete: true,
    },
  });

  if (!requeteEntite) {
    throw new Error('REQUETE_NOT_FOUND');
  }

  const reason = await prisma.requeteClotureReasonEnum.findUnique({
    where: { id: reasonId },
  });

  if (!reason) {
    throw new Error('REASON_INVALID');
  }

  const lastEtape = await prisma.requeteEtape.findFirst({
    where: {
      requeteId,
      entiteId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (lastEtape?.statutId === 'CLOTUREE') {
    throw new Error('READONLY_FOR_ENTITY');
  }

  if (fileIds && fileIds.length > 0) {
    const files = await prisma.uploadedFile.findMany({
      where: {
        id: { in: fileIds },
      },
    });

    if (files.length !== fileIds.length) {
      throw new Error('FILES_INVALID');
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const etape = await tx.requeteEtape.create({
      data: {
        requeteId,
        entiteId,
        statutId: REQUETE_STATUT_TYPES.CLOTUREE,
        clotureReasonId: reasonId,
        nom: `Requête clôturée le ${new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}`,
      },
    });

    const note = await tx.requeteEtapeNote.create({
      data: {
        requeteEtapeId: etape.id,
        texte: precision?.trim() || '',
        authorId,
      },
    });

    const noteId = note.id;

    if (fileIds && fileIds.length > 0) {
      await tx.uploadedFile.updateMany({
        where: {
          id: { in: fileIds },
        },
        data: {
          requeteEtapeNoteId: noteId,
        },
      });
    }

    return {
      etapeId: etape.id,
      closedAt: etape.createdAt.toISOString(),
      noteId,
    };
  });

  return result;
};
