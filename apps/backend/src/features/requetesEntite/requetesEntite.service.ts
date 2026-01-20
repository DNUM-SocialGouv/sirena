import { helpers } from '@sirena/backend-utils';
import { mappers } from '@sirena/common';
import {
  type EntiteType,
  REQUETE_ETAPE_STATUT_TYPES,
  REQUETE_STATUT_TYPES,
  REQUETE_UPDATE_FIELDS,
  type RequetePrioriteType,
  type RequeteStatutType,
} from '@sirena/common/constants';
import type { DeclarantDataSchema, PersonneConcerneeDataSchema, SituationDataSchema } from '@sirena/common/schemas';
import type { z } from 'zod';
import { parseAdresseDomicile } from '../../helpers/address.js';
import { sortObject } from '../../helpers/prisma/sort.js';
import { createSearchConditionsForRequeteEntite } from '../../helpers/search.js';
import { sseEventManager } from '../../helpers/sse.js';
import { type Prisma, prisma } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import { buildEntitesTraitement, getEntiteAscendanteId } from '../entites/entites.service.js';
import { createDefaultRequeteEtapes } from '../requeteEtapes/requetesEtapes.service.js';
import { generateRequeteId } from '../requetes/functionalId.service.js';
import { setFaitFiles } from '../uploadedFiles/uploadedFiles.service.js';
import {
  mapDeclarantToPrismaCreate,
  mapPersonneConcerneeToPrismaCreate,
  mapSituationFaitToPrismaCreate,
  mapSituationToPrismaCreate,
} from './requetesEntite.mapper.js';
import type { GetRequetesEntiteQuery } from './requetesEntite.type.js';

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
      motifsDeclaratifs: { include: { motifDeclaratif: true } },
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
  situationEntites: {
    include: {
      entite: true,
    },
  },
};

type SituationWithIncludes = Prisma.SituationGetPayload<{
  include: typeof SITUATION_INCLUDE_FULL;
}>;

export const enrichSituationWithTraitementDesFaits = async (situation: SituationWithIncludes) => {
  const entitesTraitement = await buildEntitesTraitement(
    situation.situationEntites.map((situationEntite) => situationEntite.entite),
  );

  return {
    ...situation,
    traitementDesFaits: {
      entites: entitesTraitement,
    },
  };
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
                    motifsDeclaratifs: {
                      include: {
                        motifDeclaratif: true,
                      },
                    },
                    fichiers: true,
                  },
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
                lieuDeSurvenue: {
                  include: {
                    adresse: true,
                    lieuType: true,
                    transportType: true,
                  },
                },
                situationEntites: {
                  include: {
                    entite: true,
                  },
                },
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

export const getOtherEntitesAffected = async (requeteId: string, excludeEntiteId: string) => {
  const requeteEntites = await prisma.requeteEntite.findMany({
    where: {
      requeteId,
      entiteId: { not: excludeEntiteId },
    },
    include: {
      entite: {
        select: {
          id: true,
          entiteTypeId: true,
          nomComplet: true,
          label: true,
        },
      },
    },
  });

  return requeteEntites.map((re) => {
    return {
      ...re.entite,
      entiteTypeId: re.entite.entiteTypeId as EntiteType,
      statutId: re.statutId as RequeteStatutType,
    };
  });
};

export const getRequeteEntiteById = async (requeteId: string, entiteId: string | null) => {
  if (!entiteId) {
    return null;
  }

  const result = await prisma.requeteEntite.findFirst({
    where: {
      requeteId,
      entiteId,
    },
    include: {
      entite: true,
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
            include: SITUATION_INCLUDE_FULL,
          },
        },
      },
      requeteEtape: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!result) {
    return null;
  }

  // Populate traitementDesFaits for each situation with associated directionServiceId
  const enrichedSituations = await Promise.all(
    result.requete?.situations?.map((situation) => enrichSituationWithTraitementDesFaits(situation)) ?? [],
  );

  return {
    ...result,
    requete: {
      ...result.requete,
      situations: enrichedSituations,
    },
  };
};

interface CreateRequeteInput {
  receptionTypeId?: string | null;
  receptionDate?: string | null;
  declarant?: DeclarantInput;
  participant?: PersonneConcerneeInput;
}

export const createRequeteEntite = async (entiteId: string, data?: CreateRequeteInput, changedById?: string) => {
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

  const maxRetries = 5;
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < maxRetries) {
    try {
      const requeteId = await generateRequeteId('SIRENA');

      const requete = await prisma.requete.create({
        data: {
          id: requeteId,
          receptionDate: data?.receptionDate ? new Date(data.receptionDate) : null,
          receptionTypeId: data?.receptionTypeId ?? null,
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
              statutId: REQUETE_STATUT_TYPES.EN_COURS,
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
        const result = await createDefaultRequeteEtapes(
          requete.id,
          entite.entiteId,
          requete.receptionDate || new Date(),
        );

        if (!result) {
          continue;
        }

        const { etape1, etape2 } = result;
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

const buildPersonneAdresseUpsert = (data: {
  adresseDomicile?: string | null;
  codePostal?: string | null;
  ville?: string | null;
}) => {
  if (!data.adresseDomicile && !data.codePostal && !data.ville) {
    return undefined;
  }

  const createUpdateData = () => {
    const { numero, rue } = parseAdresseDomicile(data.adresseDomicile || '');
    return {
      label: `${data.adresseDomicile || ''} ${data.codePostal || ''} ${data.ville || ''}` || '',
      numero,
      rue,
      codePostal: data.codePostal || '',
      ville: data.ville || '',
    };
  };

  const payload = createUpdateData();

  return {
    upsert: {
      create: payload,
      update: payload,
    },
  };
};

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
              adresse: buildPersonneAdresseUpsert(declarantData),
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
            aAutrePersonnes: participantData.aAutrePersonnes || false,
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
            adresse: buildPersonneAdresseUpsert(participantData),
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

const buildAdresseUpdate = (adresse: NonNullable<SituationInput['lieuDeSurvenue']>['adresse']) => {
  const hasAdresseData = adresse?.label || adresse?.codePostal || adresse?.ville;

  if (hasAdresseData) {
    return {
      upsert: {
        create: {
          label: cleanNullOrEmpty(adresse?.label),
          codePostal: cleanNullOrEmpty(adresse?.codePostal),
          ville: cleanNullOrEmpty(adresse?.ville),
        },
        update: {
          label: cleanNullOrEmpty(adresse?.label),
          codePostal: cleanNullOrEmpty(adresse?.codePostal),
          ville: cleanNullOrEmpty(adresse?.ville),
        },
      },
    };
  }

  return {
    upsert: {
      create: { label: '', codePostal: '', ville: '' },
      update: { label: '', codePostal: '', ville: '' },
    },
  };
};

const buildLieuDeSurvenueUpdate = (lieuData: SituationInput['lieuDeSurvenue']) => {
  if (!lieuData) return {};

  return {
    lieuTypeId: toNullableId(lieuData.lieuType),
    lieuPrecision: cleanNullOrEmpty(lieuData.lieuPrecision),
    codePostal: cleanNullOrEmpty(lieuData.codePostal),
    societeTransport: cleanNullOrEmpty(lieuData.societeTransport),
    finess: cleanNullOrEmpty(lieuData.finess),
    adresse: buildAdresseUpdate(lieuData.adresse),
  };
};

const buildMisEnCauseUpdate = (misEnCauseData: SituationInput['misEnCause']) => {
  if (!misEnCauseData) return {};

  const misEnCauseTypeId = toNullableId(misEnCauseData.misEnCauseType);
  const misEnCauseTypePrecisionId = toNullableId(misEnCauseData.misEnCauseTypePrecision);

  return {
    misEnCauseType: misEnCauseTypeId ? { connect: { id: misEnCauseTypeId } } : { disconnect: true as const },
    misEnCauseTypePrecision:
      misEnCauseTypePrecisionId && misEnCauseTypeId
        ? {
            connect: {
              misEnCauseTypeId_id: {
                misEnCauseTypeId,
                id: misEnCauseTypePrecisionId,
              },
            },
          }
        : { disconnect: true as const },
    autrePrecision: cleanNullOrEmpty(misEnCauseData.autrePrecision),
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

  if (faitData.motifs?.length) {
    for (const motifId of faitData.motifs) {
      const motif = await tx.motifEnum.findUnique({
        where: { id: motifId },
      });

      if (!motif) {
        throw new Error(`Motif "${motifId}" not found in database. Please seed the database first.`);
      }

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

const captureSituationState = async (tx: Prisma.TransactionClient, situationId: string) => {
  return tx.situation.findUnique({
    where: { id: situationId },
    include: SITUATION_INCLUDE_FULL,
  });
};

// Update Situation Affectation (traitementDesFaits)
// topEntiteId is used to validate that the user can only modify affectations belonging to their entity
const updateSituationEntites = async (
  tx: Prisma.TransactionClient,
  situationId: string,
  traitementDesFaits: SituationInput['traitementDesFaits'],
  topEntiteId: string,
) => {
  const situation = await tx.situation.findUnique({
    where: { id: situationId },
    select: { requeteId: true },
  });

  if (!situation?.requeteId) {
    throw new Error(`Situation ${situationId} does not have a requeteId`);
  }

  const { requeteId } = situation;

  // Get existing entities already associated with the situation
  const existingSituationEntites = await tx.situationEntite.findMany({
    where: { situationId },
    select: { entiteId: true },
  });

  const existingEntiteIds = new Set(existingSituationEntites.map((se) => se.entiteId));

  // Determine which existing entities belong to user's hierarchy vs other entities
  const existingEntitesWithRoots = await Promise.all(
    Array.from(existingEntiteIds).map(async (entiteId) => ({
      entiteId,
      rootId: await getEntiteAscendanteId(entiteId),
    })),
  );

  const existingUserEntiteIds = new Set(
    existingEntitesWithRoots.filter((e) => e.rootId === topEntiteId).map((e) => e.entiteId),
  );
  const existingOtherEntiteIds = new Set(
    existingEntitesWithRoots.filter((e) => e.rootId !== topEntiteId).map((e) => e.entiteId),
  );

  // Extract entity IDs from input, separating user's entities from others
  const newUserEntiteIds = new Set<string>();
  const newOtherEntiteIds = new Set<string>();

  if (traitementDesFaits?.entites) {
    for (const entite of traitementDesFaits.entites) {
      const rootId = await getEntiteAscendanteId(entite.entiteId);
      if (rootId === topEntiteId) {
        // Entity belongs to user's hierarchy
        newUserEntiteIds.add(entite.entiteId);
        if (entite.directionServiceId) {
          newUserEntiteIds.add(entite.directionServiceId);
        }
      } else {
        // Entity belongs to another hierarchy - only allow adding NEW ones
        if (!existingOtherEntiteIds.has(entite.entiteId)) {
          newOtherEntiteIds.add(entite.entiteId);
        }
        if (entite.directionServiceId && !existingOtherEntiteIds.has(entite.directionServiceId)) {
          newOtherEntiteIds.add(entite.directionServiceId);
        }
      }
    }
  }

  // Determine what is added / removed
  // - User can add entities from any hierarchy
  // - User can only remove entities from their own hierarchy
  const userEntitesToAdd = Array.from(newUserEntiteIds).filter((id) => !existingUserEntiteIds.has(id));
  const otherEntitesToAdd = Array.from(newOtherEntiteIds);
  const entitesToAdd = [...userEntitesToAdd, ...otherEntitesToAdd];
  const entitesToRemove = Array.from(existingUserEntiteIds).filter((id) => !newUserEntiteIds.has(id));

  // Delete obsolete SituationEntite (only from user's entity hierarchy)
  if (entitesToRemove.length > 0) {
    await tx.situationEntite.deleteMany({
      where: {
        situationId,
        entiteId: { in: entitesToRemove },
      },
    });
  }

  // Add new SituationEntite (from user's hierarchy + new entities from other hierarchies)
  const allEntitiesToUpsert = [...newUserEntiteIds, ...newOtherEntiteIds];
  await Promise.all(
    allEntitiesToUpsert.map((newEntiteId) =>
      tx.situationEntite.upsert({
        where: {
          situationId_entiteId: { situationId, entiteId: newEntiteId },
        },
        update: {},
        create: {
          situationId,
          entiteId: newEntiteId,
        },
      }),
    ),
  );

  // Validate that at least one entity remains (user's + new other's + existing other's)
  const remainingEntitiesCount = newUserEntiteIds.size + newOtherEntiteIds.size + existingOtherEntiteIds.size;
  if (remainingEntitiesCount === 0) {
    throw new Error('Au moins une entité administrative doit être affectée à la situation');
  }

  // Update RequeteEntite (parent entities only)
  const entiteMereIdsToAdd = new Set<string>();

  await Promise.all(
    entitesToAdd.map(async (entiteToAdd) => {
      const rootId = await getEntiteAscendanteId(entiteToAdd); // Get top entity (ARS/CD/DD)
      if (rootId) entiteMereIdsToAdd.add(rootId);
    }),
  );

  // Add parent entities for all added entities
  await Promise.all(
    Array.from(entiteMereIdsToAdd).map(async (rootId) => {
      return tx.requeteEntite.upsert({
        where: {
          requeteId_entiteId: { requeteId, entiteId: rootId },
        },
        update: {},
        create: {
          requeteId,
          entiteId: rootId,
          statutId: REQUETE_STATUT_TYPES.NOUVEAU,
        },
      });
    }),
  );

  // Create default steps for all added top entities
  await Promise.all(
    Array.from(entiteMereIdsToAdd).map(async (rootId) => {
      await createDefaultRequeteEtapes(requeteId, rootId, new Date(), tx);
    }),
  );
};

const updateExistingSituation = async (
  tx: Prisma.TransactionClient,
  existingSituation: { id: string; faits: unknown[] },
  situationData: SituationInput,
  topEntiteId: string,
  changedById?: string,
) => {
  const before = changedById ? await captureSituationState(tx, existingSituation.id) : null;

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

  await updateSituationEntites(tx, existingSituation.id, situationData.traitementDesFaits, topEntiteId);

  if (changedById) {
    const after = await captureSituationState(tx, existingSituation.id);
    await createChangeLog({
      entity: 'Situation',
      entityId: existingSituation.id,
      action: ChangeLogAction.UPDATED,
      before: JSON.parse(JSON.stringify(before)) as Prisma.JsonObject,
      after: JSON.parse(JSON.stringify(after)) as Prisma.JsonObject,
      changedById,
    });
  }
};

const createNewSituation = async (
  tx: Prisma.TransactionClient,
  requeteId: string,
  situationData: SituationInput,
  topEntiteId: string,
  changedById?: string,
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

  await updateSituationEntites(tx, createdSituation.id, situationData.traitementDesFaits, topEntiteId);

  if (changedById) {
    const after = await captureSituationState(tx, createdSituation.id);
    await createChangeLog({
      entity: 'Situation',
      entityId: createdSituation.id,
      action: ChangeLogAction.CREATED,
      before: null,
      after: JSON.parse(JSON.stringify(after)) as Prisma.JsonObject,
      changedById,
    });
  }

  return { id: createdSituation.id };
};

export const createRequeteSituation = async (
  requeteId: string,
  situationData: SituationInput,
  entiteId: string,
  changedById?: string,
) => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  let createdSituationId: string | null = null;

  const _result = await prisma.$transaction(async (tx) => {
    const newSituation = await createNewSituation(tx, requeteId, situationData, entiteId, changedById);
    createdSituationId = newSituation.id;

    return tx.requete.findUnique({
      where: { id: requeteId },
      include: { situations: { include: SITUATION_INCLUDE_FULL } },
    });
  });

  if (createdSituationId && situationData.fait?.fileIds?.length) {
    await setFaitFiles(createdSituationId, situationData.fait.fileIds, entiteId, changedById);
  }

  return prisma.requete.findUnique({
    where: { id: requeteId },
    include: { situations: { include: SITUATION_INCLUDE_FULL } },
  });
};

export const updateRequeteSituation = async (
  requeteId: string,
  situationId: string,
  situationData: SituationInput,
  entiteId: string,
  changedById?: string,
) => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    include: { situations: { include: SITUATION_INCLUDE_BASE } },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  await prisma.$transaction(async (tx) => {
    const existingSituation = requete.situations.find((s) => s.id === situationId);
    if (!existingSituation) {
      throw new Error('Situation not found');
    }
    await updateExistingSituation(tx, existingSituation, situationData, entiteId, changedById);
  });

  if (situationData.fait?.fileIds?.length) {
    await setFaitFiles(situationId, situationData.fait.fileIds, entiteId, changedById);
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
  // Helper function to create changelog for RequeteEtapeNote
  const createRequeteEtapeNoteChangelog = async (
    noteId: string,
    action: ChangeLogAction,
    before: Prisma.JsonObject | null,
    after: Prisma.JsonObject | null,
    changedById: string,
  ) => {
    await createChangeLog({
      entity: 'RequeteEtapeNote',
      entityId: noteId,
      action,
      before,
      after,
      changedById,
    });
  };

  // Helper function to create changelog for UploadedFile
  const createUploadedFileChangelog = async (
    fileId: string,
    action: ChangeLogAction,
    before: Prisma.JsonObject | null,
    after: Prisma.JsonObject | null,
    changedById: string,
  ) => {
    await createChangeLog({
      entity: 'UploadedFile',
      entityId: fileId,
      action,
      before,
      after,
      changedById,
    });
  };

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
        statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
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

    await updateStatusRequete(requeteId, entiteId, REQUETE_STATUT_TYPES.CLOTUREE);

    return {
      etapeId: etape.id,
      closedAt: etape.createdAt.toISOString(),
      noteId,
      etape,
      note,
    };
  });

  // Create changelogs for the created step and note
  await createRequeteEtapeNoteChangelog(
    result.noteId,
    ChangeLogAction.CREATED,
    null,
    {
      id: result.note.id,
      texte: result.note.texte,
      authorId: result.note.authorId,
      requeteEtapeId: result.note.requeteEtapeId,
      createdAt: result.note.createdAt.toISOString(),
    } as Prisma.JsonObject,
    authorId,
  );

  // Create changelogs for the uploaded files if any
  if (fileIds && fileIds.length > 0) {
    const files = await prisma.uploadedFile.findMany({
      where: {
        id: { in: fileIds },
      },
    });

    for (const file of files) {
      await createUploadedFileChangelog(
        file.id,
        ChangeLogAction.UPDATED,
        {
          requeteEtapeNoteId: null,
          metadata: file.metadata,
        } as Prisma.JsonObject,
        {
          requeteEtapeNoteId: result.noteId,
          metadata: file.metadata,
        } as Prisma.JsonObject,
        authorId,
      );
    }
  }

  return result;
};

export const updateStatusRequete = async (requeteId: string, entiteId: string, statut: RequeteStatutType) => {
  const requeteEntite = await prisma.requeteEntite.update({
    where: { requeteId_entiteId: { requeteId, entiteId } },
    data: { statutId: statut },
  });

  sseEventManager.emitRequeteUpdated({
    requeteId,
    entiteId,
    field: REQUETE_UPDATE_FIELDS.STATUS,
  });

  return requeteEntite;
};

export const updatePrioriteRequete = async (
  requeteId: string,
  entiteId: string,
  prioriteId: RequetePrioriteType | null,
  changedById?: string,
) => {
  const before = await prisma.requeteEntite.findUnique({
    where: { requeteId_entiteId: { requeteId, entiteId } },
    select: { prioriteId: true },
  });

  const requeteEntite = await prisma.requeteEntite.update({
    where: { requeteId_entiteId: { requeteId, entiteId } },
    data: { prioriteId: prioriteId || null },
  });

  if (changedById && before?.prioriteId !== requeteEntite.prioriteId) {
    await createChangeLog({
      entity: 'RequeteEntite',
      entityId: requeteId,
      action: ChangeLogAction.UPDATED,
      before: { prioriteId: before?.prioriteId ?? null } as Prisma.JsonObject,
      after: { prioriteId: requeteEntite.prioriteId } as Prisma.JsonObject,
      changedById,
    });
  }

  sseEventManager.emitRequeteUpdated({
    requeteId,
    entiteId,
    field: REQUETE_UPDATE_FIELDS.PRIORITY,
  });

  return requeteEntite;
};
