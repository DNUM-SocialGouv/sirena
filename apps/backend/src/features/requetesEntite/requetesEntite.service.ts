import { helpers } from '@sirena/backend-utils';
import { mappers } from '@sirena/common';
import {
  demarcheEngageeLabels,
  type EntiteType,
  MOTIFS_HIERARCHICAL_DATA,
  REQUETE_ETAPE_STATUT_TYPES,
  REQUETE_ETAPE_TYPES,
  REQUETE_STATUT_TYPES,
  REQUETE_UPDATE_FIELDS,
  type RequetePrioriteType,
  type RequeteStatutType,
} from '@sirena/common/constants';
import type { DeclarantDataSchema, PersonneConcerneeDataSchema, SituationDataSchema } from '@sirena/common/schemas';
import archiver from 'archiver';
import type { z } from 'zod';
import { getOriginalFileName } from '../../helpers/file.js';
import { sortObject } from '../../helpers/prisma/sort.js';
import { createSearchConditionsForRequeteEntite } from '../../helpers/search.js';
import { sseEventManager } from '../../helpers/sse.js';
import { formatDateFr } from '../../helpers/string.js';
import { deleteFileFromMinio, getFileStream } from '../../libs/minio.js';
import { type Prisma, prisma, type UploadedFile } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import { buildEntitesTraitement, getEntiteAscendanteInfo, getEntiteDescendantIds } from '../entites/entites.service.js';
import { createDefaultRequeteEtapes } from '../requeteEtapes/requetesEtapes.service.js';
import { generateRequeteId } from '../requetes/functionalId.service.js';
import { deleteFaitFilesRemovedFromSituation, setFaitFiles } from '../uploadedFiles/uploadedFiles.service.js';
import {
  mapDeclarantToPrismaCreate,
  mapPersonneConcerneeToPrismaCreate,
  mapSituationFaitToPrismaCreate,
  mapSituationToPrismaCreate,
} from './requetesEntite.mapper.js';
import { RequetePdfBuilder } from './requetesEntite.pdf.builder.js';
import type { CreateChangeLogForRequeteEntiteDto, GetRequetesEntiteQuery } from './requetesEntite.type.js';

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

// Mirrors the extractDptCode logic from getRequetesEntite for consistency.
// For Corsica (2A/2B), resolves via InseePostal since they can't be derived from postal code prefix.
const buildDeptPostalFilter = async (deptCodes: string[]): Promise<Prisma.LieuDeSurvenueWhereInput | null> => {
  const corseaCodes = deptCodes.filter((c) => c === '2A' || c === '2B');
  const regularCodes = deptCodes.filter((c) => c !== '2A' && c !== '2B');

  const orConditions: Prisma.LieuDeSurvenueWhereInput[] = regularCodes.map((code) => ({
    OR: [{ codePostal: { startsWith: code } }, { adresse: { codePostal: { startsWith: code } } }],
  }));

  if (corseaCodes.length > 0) {
    const rows = await prisma.inseePostal.findMany({
      where: { commune: { dptCodeActuel: { in: corseaCodes } } },
      select: { codePostal: true },
      distinct: ['codePostal'],
    });
    const corseCPs = rows.map((r) => r.codePostal);
    if (corseCPs.length > 0) {
      orConditions.push({
        OR: [{ codePostal: { in: corseCPs } }, { adresse: { codePostal: { in: corseCPs } } }],
      });
    }
  }

  return orConditions.length === 0 ? null : { OR: orConditions };
};

const buildRequetesEntiteWhere = async (
  entiteIds: string[] | null,
  query: { search?: string; entiteId?: string; departementCodes?: string },
): Promise<Prisma.RequeteEntiteWhereInput> => {
  const { search, entiteId, departementCodes } = query;
  const searchConditions: Prisma.RequeteEntiteWhereInput = search ? createSearchConditionsForRequeteEntite(search) : {};
  const andFilters: Prisma.RequeteEntiteWhereInput[] = [];

  if (Array.isArray(entiteIds) && entiteIds.length > 0) {
    andFilters.push({ entiteId: { in: entiteIds } });
  }
  if (entiteId) {
    const descendantIds = (await getEntiteDescendantIds(entiteId)) ?? [];
    const idsToInclude = [entiteId, ...descendantIds];
    andFilters.push({
      requete: {
        situations: {
          some: {
            situationEntites: {
              some: { entiteId: { in: idsToInclude } },
            },
          },
        },
      },
    });
  }
  if (departementCodes) {
    const codes = departementCodes
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const lieuFilter = codes.length > 0 ? await buildDeptPostalFilter(codes) : null;
    if (lieuFilter) {
      andFilters.push({
        requete: { situations: { some: { lieuDeSurvenue: lieuFilter } } },
      });
    }
  }

  return {
    ...searchConditions,
    ...(andFilters.length > 0 ? { AND: andFilters } : {}),
  };
};

// TODO handle entiteIds
export const getRequetesEntite = async (entiteIds: string[] | null, query: GetRequetesEntiteQuery = {}) => {
  const { offset = 0, limit, sort = 'requete.createdAt', order = 'desc' } = query;

  const where = await buildRequetesEntiteWhere(entiteIds, query);

  const [rawData, total] = await Promise.all([
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
              include: SITUATION_INCLUDE_FULL,
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

  // DOM (97x) → 3 digits, otherwise → 2 digits. Also works for cedex codes (e.g. 75674 → "75").
  const extractDptCode = (cp: string): string =>
    cp.length >= 3 && cp.startsWith('97') ? cp.slice(0, 3) : cp.slice(0, 2);

  const getCpFromSituation = (s: (typeof rawData)[number]['requete']['situations'][number]) =>
    s.lieuDeSurvenue?.codePostal || s.lieuDeSurvenue?.adresse?.codePostal || '';

  const cpToDptCode = new Map<string, string>();
  for (const re of rawData) {
    for (const s of re.requete?.situations ?? []) {
      const cp = getCpFromSituation(s);
      if (cp && !cpToDptCode.has(cp)) cpToDptCode.set(cp, extractDptCode(cp));
    }
  }

  // Corsican postal codes all start with "20" but their dept codes in DB are "2A" or "2B" —
  // the split cannot be derived from the postal code alone, so we resolve via InseePostal.
  const corseCPs = [...cpToDptCode.entries()].filter(([, dpt]) => dpt === '20').map(([cp]) => cp);
  if (corseCPs.length > 0) {
    const corseInsee = await prisma.inseePostal.findMany({
      where: { codePostal: { in: corseCPs } },
      select: { codePostal: true, commune: { select: { dptCodeActuel: true } } },
      distinct: ['codePostal'],
    });
    for (const row of corseInsee) {
      if (row.commune) cpToDptCode.set(row.codePostal, row.commune.dptCodeActuel);
    }
  }

  const uniqueDptCodes = [...new Set(cpToDptCode.values())];

  const communesQuery =
    uniqueDptCodes.length > 0
      ? prisma.commune.findMany({
          where: { dptCodeActuel: { in: uniqueDptCodes } },
          select: { dptCodeActuel: true, dptLibActuel: true },
        })
      : Promise.resolve([]);

  const [communes, enrichedRows] = await Promise.all([
    communesQuery,
    Promise.all(
      rawData.map(async (requeteEntite) => ({
        requeteEntite,
        enrichedSituations: await Promise.all(
          requeteEntite.requete?.situations?.map((s) => enrichSituationWithTraitementDesFaits(s)) ?? [],
        ),
      })),
    ),
  ]);

  const dptToDept: Record<string, { code: string; lib: string }> = {};
  for (const c of communes) {
    dptToDept[c.dptCodeActuel] = { code: c.dptCodeActuel, lib: c.dptLibActuel };
  }

  const data = enrichedRows.map(({ requeteEntite, enrichedSituations }) => {
    const seenDptCodes = new Set<string>();
    const departementsLieuSurvenue = (requeteEntite.requete?.situations ?? []).flatMap((s) => {
      const cp = getCpFromSituation(s);
      if (!cp) return [];
      const dptCode = cpToDptCode.get(cp) ?? extractDptCode(cp);
      if (seenDptCodes.has(dptCode)) return [];
      seenDptCodes.add(dptCode);
      // Fallback to code-only if geodata is not seeded.
      return [dptToDept[dptCode] ?? { code: dptCode, lib: '' }];
    });

    return {
      ...requeteEntite,
      departementsLieuSurvenue,
      requete: {
        ...requeteEntite.requete,
        situations: enrichedSituations,
      },
    };
  });

  return {
    data,
    total,
  };
};

export const getRequetesCountsByDepartement = async (
  entiteIds: string[] | null,
  departementCodes: string[],
  baseQuery: { search?: string; entiteId?: string },
) => {
  const results = await Promise.all(
    departementCodes.map(async (code) => {
      const where = await buildRequetesEntiteWhere(entiteIds, { ...baseQuery, departementCodes: code });
      const count = await prisma.requeteEntite.count({ where });
      return { code, count };
    }),
  );
  return results;
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
  provenanceId?: string | null;
  provenancePrecision?: string | null;
  declarant?: DeclarantInput;
  participant?: PersonneConcerneeInput;
}

export const createRequeteEntite = async (entiteId: string, data?: CreateRequeteInput, changedById?: string) => {
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
          provenanceId: data?.provenanceId ?? null,
          provenancePrecision: data?.provenancePrecision ?? null,
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
          createdById: changedById,
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
        await createDefaultRequeteEtapes(requete.id, entite.entiteId, undefined, changedById);
      }

      if (data?.declarant?.estPersonneConcernee && requete.declarant) {
        await prisma.personneConcernee.update({
          where: { id: requete.declarant.id },
          data: { participantDeId: requete.id },
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

const buildPersonneAdresseUpsert = (data: {
  adresseDomicile?: string | null;
  codePostal?: string | null;
  ville?: string | null;
}) => {
  if (!data.adresseDomicile && !data.codePostal && !data.ville) {
    return undefined;
  }

  const payload = {
    rue: data.adresseDomicile || '',
    codePostal: data.codePostal || '',
    ville: data.ville || '',
  };

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
      // Build identite upsert - use upsert instead of update to handle case where identite doesn't exist yet
      const identiteUpsert = {
        upsert: {
          create: {
            nom: declarantData.nom || '',
            prenom: declarantData.prenom || '',
            email: declarantData.courrierElectronique || '',
            telephone: declarantData.numeroTelephone || '',
            civiliteId: mappers.mapCiviliteToDatabase(declarantData.civilite),
          },
          update: {
            nom: declarantData.nom || '',
            prenom: declarantData.prenom || '',
            email: declarantData.courrierElectronique || '',
            telephone: declarantData.numeroTelephone || '',
            civiliteId: mappers.mapCiviliteToDatabase(declarantData.civilite),
          },
        },
      };

      return await prisma.requete.update({
        where: { id: requeteId },
        data: {
          declarant: {
            update: {
              estIdentifie: true,
              veutGarderAnonymat:
                declarantData.consentCommuniquerIdentite === undefined
                  ? undefined
                  : !declarantData.consentCommuniquerIdentite,
              isTuteur: declarantData.isTuteur ?? undefined,
              estSignalementProfessionnel: declarantData.estSignalementProfessionnel ?? null,
              estVictime: declarantData.estPersonneConcernee || false,
              commentaire: declarantData.autresPrecisions || '',
              lienVictimeId: lienVictimeValue,
              lienAutrePrecision: lienAutrePrecisionValue,
              updatedAt: new Date(),
              identite: identiteUpsert,
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
  // capture the current PC data BEFORE the update so the new PC record keeps the original data
  const previousPcData = !declarantData.estPersonneConcernee
    ? await prisma.personneConcernee.findFirst({
        where: { declarantDeId: requeteId, participantDeId: requeteId },
        include: { identite: true, adresse: true },
      })
    : null;

  const result = await updateRequete(requeteId, { declarant: declarantData }, controls);

  const declarant = await prisma.personneConcernee.findFirst({
    where: { declarantDeId: requeteId },
  });

  if (!declarant) return result;

  if (declarantData.estPersonneConcernee) {
    // Check if a separate PC record already exists
    const existingParticipant = await prisma.personneConcernee.findFirst({
      where: { participantDeId: requeteId, NOT: { id: declarant.id } },
    });

    if (existingParticipant) {
      // Keep the PC's data: transfer declarantDeId to the existing PC record
      await prisma.personneConcernee.update({
        where: { id: declarant.id },
        data: { declarantDeId: null },
      });
      await prisma.personneConcernee.update({
        where: { id: existingParticipant.id },
        data: { declarantDeId: requeteId, estVictime: true },
      });
      // Delete the old declarant record
      await prisma.personneConcernee.deleteMany({
        where: { id: declarant.id },
      });
    } else if (declarant.participantDeId !== requeteId) {
      await prisma.personneConcernee.update({
        where: { id: declarant.id },
        data: { participantDeId: requeteId },
      });
    }
  } else {
    // separate PC record with the ORIGINAL data
    if (declarant.participantDeId === requeteId) {
      await prisma.personneConcernee.update({
        where: { id: declarant.id },
        data: { participantDeId: null },
      });
      await prisma.personneConcernee.create({
        data: {
          participantDeId: requeteId,
          ...(previousPcData?.ageId && { ageId: previousPcData.ageId }),
          ...(previousPcData?.dateNaissance && { dateNaissance: previousPcData.dateNaissance }),
          veutGarderAnonymat: previousPcData?.veutGarderAnonymat ?? null,
          estHandicapee: previousPcData?.estHandicapee ?? null,
          estVictimeInformee: previousPcData?.estVictimeInformee ?? null,
          victimeInformeeCommentaire: previousPcData?.victimeInformeeCommentaire ?? '',
          commentaire: previousPcData?.commentaire ?? '',
          aAutrePersonnes: previousPcData?.aAutrePersonnes ?? null,
          autrePersonnes: previousPcData?.autrePersonnes ?? '',
          ...(previousPcData?.identite && {
            identite: {
              create: {
                nom: previousPcData.identite.nom,
                prenom: previousPcData.identite.prenom,
                email: previousPcData.identite.email,
                telephone: previousPcData.identite.telephone,
                civiliteId: previousPcData.identite.civiliteId,
              },
            },
          }),
          ...(previousPcData?.adresse && {
            adresse: {
              create: {
                rue: previousPcData.adresse.rue,
                codePostal: previousPcData.adresse.codePostal,
                ville: previousPcData.adresse.ville,
              },
            },
          }),
        },
      });
    }
  }

  return result;
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
    const identiteUpsert = {
      upsert: {
        create: {
          nom: participantData.nom || '',
          prenom: participantData.prenom || '',
          email: participantData.courrierElectronique || '',
          telephone: participantData.numeroTelephone || '',
          civiliteId: mappers.mapCiviliteToDatabase(participantData.civilite),
        },
        update: {
          nom: participantData.nom || '',
          prenom: participantData.prenom || '',
          email: participantData.courrierElectronique || '',
          telephone: participantData.numeroTelephone || '',
          civiliteId: mappers.mapCiviliteToDatabase(participantData.civilite),
        },
      },
    };

    return await prisma.requete.update({
      where: { id: requeteId },
      data: {
        participant: {
          update: {
            estHandicapee: participantData.estHandicapee ?? undefined,
            veutGarderAnonymat:
              participantData.consentCommuniquerIdentite === undefined
                ? undefined
                : !participantData.consentCommuniquerIdentite,
            estVictimeInformee: participantData.estVictimeInformee ?? undefined,
            victimeInformeeCommentaire:
              participantData.estVictimeInformee === false ? participantData.victimeInformeeCommentaire || '' : '',
            autrePersonnes: participantData.autrePersonnes || '',
            aAutrePersonnes: participantData.aAutrePersonnes ?? undefined,
            commentaire: participantData.commentaire || '',
            ageId: participantData.age || undefined,
            dateNaissance: participantData.dateNaissance ? new Date(participantData.dateNaissance) : null,
            updatedAt: new Date(),
            identite: identiteUpsert,
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
  const hasAdresseData = adresse?.label || adresse?.numero || adresse?.rue || adresse?.codePostal || adresse?.ville;

  if (hasAdresseData) {
    return {
      upsert: {
        create: {
          label: cleanNullOrEmpty(adresse?.label),
          numero: cleanNullOrEmpty(adresse?.numero),
          rue: cleanNullOrEmpty(adresse?.rue),
          codePostal: cleanNullOrEmpty(adresse?.codePostal),
          ville: cleanNullOrEmpty(adresse?.ville),
        },
        update: {
          label: cleanNullOrEmpty(adresse?.label),
          numero: cleanNullOrEmpty(adresse?.numero),
          rue: cleanNullOrEmpty(adresse?.rue),
          codePostal: cleanNullOrEmpty(adresse?.codePostal),
          ville: cleanNullOrEmpty(adresse?.ville),
        },
      },
    };
  }

  return {
    upsert: {
      create: { label: '', numero: '', rue: '', codePostal: '', ville: '' },
      update: { label: '', numero: '', rue: '', codePostal: '', ville: '' },
    },
  };
};

const buildLieuDeSurvenueUpdate = (lieuData: SituationInput['lieuDeSurvenue']) => {
  if (!lieuData) return {};

  return {
    lieuTypeId: toNullableId(lieuData.lieuType),
    lieuPrecision: cleanNullOrEmpty(lieuData.lieuPrecision),
    transportTypeId: toNullableId(lieuData.transportType),
    codePostal: cleanNullOrEmpty(lieuData.codePostal),
    societeTransport: cleanNullOrEmpty(lieuData.societeTransport),
    finess: cleanNullOrEmpty(lieuData.finess),
    tutelle: cleanNullOrEmpty(lieuData.tutelle),
    categCode: cleanNullOrEmpty(lieuData.categCode),
    categLib: cleanNullOrEmpty(lieuData.categLib),
    adresse: buildAdresseUpdate(lieuData.adresse),
  };
};

const buildMisEnCauseUpdate = (misEnCauseData: SituationInput['misEnCause']) => {
  if (!misEnCauseData) return {};

  const misEnCauseTypeId = toNullableId(misEnCauseData.misEnCauseType);
  const misEnCauseTypePrecisionId = toNullableId(misEnCauseData.misEnCauseTypePrecision);
  const resolvedPrecisionId = misEnCauseTypeId && misEnCauseTypePrecisionId ? misEnCauseTypePrecisionId : null;

  return {
    misEnCauseTypeId,
    misEnCauseTypePrecisionId: resolvedPrecisionId,
    autrePrecision: cleanNullOrEmpty(misEnCauseData.autrePrecision),
    rpps: misEnCauseData.rpps || null,
    nom: cleanNullOrEmpty(misEnCauseData.nom),
    prenom: cleanNullOrEmpty(misEnCauseData.prenom),
    civilite: cleanNullOrEmpty(misEnCauseData.civilite),
    commentaire: cleanNullOrEmpty(misEnCauseData.commentaire),
    finess: misEnCauseData.finess || null,
    nomService: misEnCauseData.nomService || null,
    codePostal: misEnCauseData.codePostal || null,
    ville: misEnCauseData.ville || null,
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

  // Handle motifs (qualifiés)
  if (faitData.motifs !== undefined) {
    await tx.faitMotif.deleteMany({ where: { situationId } });

    if (faitData.motifs?.length) {
      for (const motifId of faitData.motifs) {
        const motif = await tx.motifEnum.findUnique({ where: { id: motifId } });
        if (!motif) {
          throw new Error(`Motif "${motifId}" not found in database. Please seed the database first.`);
        }

        await tx.faitMotif.create({
          data: { situationId, motifId: motif.id },
        });
      }
    }
  }

  // Handle consequences
  if (faitData.consequences !== undefined) {
    await tx.faitConsequence.deleteMany({ where: { situationId } });
    if (faitData.consequences.length > 0) {
      await tx.faitConsequence.createMany({
        data: faitData.consequences.map((consequenceId) => ({ situationId, consequenceId })),
      });
    }
  }

  // Handle maltraitanceTypes
  if (faitData.maltraitanceTypes !== undefined) {
    await tx.faitMaltraitanceType.deleteMany({ where: { situationId } });
    if (faitData.maltraitanceTypes.length > 0) {
      await tx.faitMaltraitanceType.createMany({
        data: faitData.maltraitanceTypes.map((maltraitanceTypeId) => ({
          situationId,
          maltraitanceTypeId,
        })),
        skipDuplicates: true,
      });
    }
  }

  await tx.fait.update({
    where: { situationId },
    data: {
      dateDebut: parseNullableDate(faitData.dateDebut),
      dateFin: parseNullableDate(faitData.dateFin),
      commentaire: cleanNullOrEmpty(faitData.commentaire),
      autresPrecisions: cleanNullOrEmpty(faitData.autresPrecisions),
    },
  });
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
): Promise<{ newRequeteRootIds: string[]; newDirectionServiceIds: string[] }> => {
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
    Array.from(existingEntiteIds).map(async (entiteId) => {
      const { entiteId: rootId } = await getEntiteAscendanteInfo(entiteId);
      return { entiteId, rootId };
    }),
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
  const allDirectionServiceIds = new Set<string>();

  if (traitementDesFaits?.entites) {
    for (const entite of traitementDesFaits.entites) {
      if (entite.directionServiceId) {
        allDirectionServiceIds.add(entite.directionServiceId);
      }
      const { entiteId: rootId } = await getEntiteAscendanteInfo(entite.entiteId);
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
      const { entiteId: rootId } = await getEntiteAscendanteInfo(entiteToAdd); // Get top entity (ARS/CD/DD)
      if (rootId) entiteMereIdsToAdd.add(rootId);
    }),
  );

  const existingRequeteEntites = await tx.requeteEntite.findMany({
    where: { requeteId },
    select: { entiteId: true },
  });
  const existingRootIds = new Set(existingRequeteEntites.map((re) => re.entiteId));
  const newToRequeteRootIds = Array.from(entiteMereIdsToAdd).filter((id) => !existingRootIds.has(id));

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
      await createDefaultRequeteEtapes(requeteId, rootId, tx, null);
    }),
  );

  const newDirectionServiceIds = entitesToAdd.filter((id) => allDirectionServiceIds.has(id));

  return { newRequeteRootIds: newToRequeteRootIds, newDirectionServiceIds };
};

const updateExistingSituation = async (
  tx: Prisma.TransactionClient,
  existingSituation: { id: string; faits: unknown[] },
  situationData: SituationInput,
  topEntiteId: string,
  changedById?: string,
): Promise<{ newAssignedEntiteIds: string[]; newDirectionServiceIds: string[]; deletedFilePaths: string[] }> => {
  const before = changedById ? await captureSituationState(tx, existingSituation.id) : null;

  const { filePaths: deletedFilePaths } = await deleteFaitFilesRemovedFromSituation(
    existingSituation.id,
    situationData.fait?.fileIds ?? [],
    topEntiteId,
    changedById ?? undefined,
    tx,
  );

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

  const { newRequeteRootIds: newAssignedEntiteIds, newDirectionServiceIds } = await updateSituationEntites(
    tx,
    existingSituation.id,
    situationData.traitementDesFaits,
    topEntiteId,
  );

  if (situationData.fait?.fileIds?.length) {
    await setFaitFiles(existingSituation.id, situationData.fait.fileIds, topEntiteId, changedById ?? undefined, tx);
  }

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

  return { newAssignedEntiteIds, newDirectionServiceIds, deletedFilePaths };
};

const createNewSituation = async (
  tx: Prisma.TransactionClient,
  requeteId: string,
  situationData: SituationInput,
  topEntiteId: string,
  changedById?: string,
): Promise<{ id: string; newAssignedEntiteIds: string[]; newDirectionServiceIds: string[] }> => {
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

  const { newRequeteRootIds: newAssignedEntiteIds, newDirectionServiceIds } = await updateSituationEntites(
    tx,
    createdSituation.id,
    situationData.traitementDesFaits,
    topEntiteId,
  );

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

  return { id: createdSituation.id, newAssignedEntiteIds, newDirectionServiceIds };
};

export type ShouldCloseRequeteStatus = {
  willUserBeUnassignedAfterSave: boolean;
  otherEntitiesAffected: Array<{
    id: string;
    nomComplet: string;
    entiteTypeId: string;
    statutId: string;
  }>;
};

const getRootEntiteIdsFromTraitementDesFaits = async (traitementDesFaits: SituationInput['traitementDesFaits']) => {
  const assignedEntiteIds = new Set<string>();

  for (const entite of traitementDesFaits?.entites ?? []) {
    assignedEntiteIds.add(entite.entiteId);
  }

  const topEntiteIds = new Set<string>();
  await Promise.all(
    Array.from(assignedEntiteIds).map(async (assignedEntiteId) => {
      const { entiteId: topEntiteId } = await getEntiteAscendanteInfo(assignedEntiteId);
      if (topEntiteId) {
        topEntiteIds.add(topEntiteId);
      }
    }),
  );

  return Array.from(topEntiteIds);
};

export const computeShouldCloseRequeteStatus = async (params: {
  tx?: Prisma.TransactionClient;
  requeteId: string;
  userEntityIds: string[];
  excludeTopEntiteId?: string;
}): Promise<ShouldCloseRequeteStatus> => {
  const { tx = prisma, requeteId, userEntityIds, excludeTopEntiteId } = params;

  // Check if user is still assigned to at least one situation after save
  const hasAnyAssignment = await tx.situationEntite.findFirst({
    where: {
      entiteId: { in: userEntityIds },
      situation: { requeteId },
    },
    select: { entiteId: true },
  });

  const willUserBeUnassignedAfterSave = !hasAnyAssignment;

  // Get other entities affected
  let otherEntitiesAffected: ShouldCloseRequeteStatus['otherEntitiesAffected'] = [];
  if (excludeTopEntiteId) {
    const otherEntites = await getOtherEntitesAffected(requeteId, excludeTopEntiteId);
    otherEntitiesAffected = otherEntites.map((entite) => ({
      id: entite.id,
      nomComplet: entite.nomComplet,
      entiteTypeId: entite.entiteTypeId || '',
      statutId: entite.statutId || '',
    }));
  }

  return {
    willUserBeUnassignedAfterSave,
    otherEntitiesAffected,
  };
};

export const createRequeteSituation = async (
  requeteId: string,
  situationData: SituationInput,
  entiteId: string,
  changedById?: string,
  userEntityIds?: string[],
  topEntiteId?: string,
): Promise<{
  requete: Awaited<ReturnType<typeof prisma.requete.findUnique>>;
  newAssignedEntiteIds: string[];
  newDirectionServiceIds: string[];
  shouldCloseRequeteStatus?: ShouldCloseRequeteStatus;
}> => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  let createdSituationId: string | null = null;
  let newAssignedEntiteIds: string[] = [];
  let newDirectionServiceIds: string[] = [];
  let updatedRequete: Awaited<ReturnType<typeof prisma.requete.findUnique>> = null;

  const entiteIdsToUpdate: string[] = [];

  if (situationData.traitementDesFaits?.entites?.length) {
    const topEntiteIds = await getRootEntiteIdsFromTraitementDesFaits(situationData.traitementDesFaits);

    if (topEntiteIds.length > 0) {
      const requeteEntite = await prisma.requeteEntite.findMany({
        where: {
          requeteId,
          entiteId: { in: topEntiteIds },
          statutId: REQUETE_STATUT_TYPES.CLOTUREE,
        },
        select: { entiteId: true },
      });
      entiteIdsToUpdate.push(...requeteEntite.map((re) => re.entiteId));
    }
  }

  await prisma.$transaction(async (tx) => {
    const newSituation = await createNewSituation(tx, requeteId, situationData, entiteId, changedById);
    createdSituationId = newSituation.id;
    newAssignedEntiteIds = newSituation.newAssignedEntiteIds;
    newDirectionServiceIds = newSituation.newDirectionServiceIds;
    await tx.requeteEntite.updateMany({
      where: {
        requeteId,
        entiteId: { in: entiteIdsToUpdate },
      },
      data: {
        statutId: REQUETE_STATUT_TYPES.NOUVEAU,
      },
    });
    updatedRequete = await tx.requete.findUnique({
      where: { id: requeteId },
      include: { situations: { include: SITUATION_INCLUDE_FULL } },
    });
  });

  if (createdSituationId && situationData.fait?.fileIds?.length) {
    await setFaitFiles(createdSituationId, situationData.fait.fileIds, entiteId, changedById);
  }

  if (!updatedRequete) {
    throw new Error('Requete not found after create situation');
  }

  // Compute should close requete status
  let shouldCloseRequeteStatus: ShouldCloseRequeteStatus | undefined;
  if (userEntityIds && userEntityIds.length > 0) {
    shouldCloseRequeteStatus = await computeShouldCloseRequeteStatus({
      requeteId,
      userEntityIds,
      excludeTopEntiteId: topEntiteId,
    });
  }

  return { requete: updatedRequete, newAssignedEntiteIds, newDirectionServiceIds, shouldCloseRequeteStatus };
};

export const updateRequeteSituation = async (
  requeteId: string,
  situationId: string,
  situationData: SituationInput,
  entiteId: string,
  changedById?: string,
  userEntityIds?: string[],
  topEntiteId?: string,
): Promise<{
  requete: Awaited<ReturnType<typeof prisma.requete.findUnique>>;
  newAssignedEntiteIds: string[];
  newDirectionServiceIds: string[];
  shouldCloseRequeteStatus?: ShouldCloseRequeteStatus;
}> => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    include: { situations: { include: SITUATION_INCLUDE_BASE } },
  });
  if (!requete) {
    throw new Error('Requete not found');
  }

  let newAssignedEntiteIds: string[] = [];
  let newDirectionServiceIds: string[] = [];
  let updatedRequete: Awaited<ReturnType<typeof prisma.requete.findUnique>> = null;
  const entiteIdsToUpdate: string[] = [];

  if (situationData.traitementDesFaits?.entites?.length) {
    const topEntiteIds = await getRootEntiteIdsFromTraitementDesFaits(situationData.traitementDesFaits);
    if (topEntiteIds.length > 0) {
      const requeteEntites = await prisma.requeteEntite.findMany({
        where: {
          requeteId,
          entiteId: { in: topEntiteIds },
          statutId: REQUETE_STATUT_TYPES.CLOTUREE,
        },
        select: { entiteId: true },
      });
      entiteIdsToUpdate.push(...requeteEntites.map((re) => re.entiteId));
    }
  }

  let deletedFilePaths: string[] = [];
  await prisma.$transaction(async (tx) => {
    const existingSituation = requete.situations.find((s) => s.id === situationId);
    if (!existingSituation) {
      throw new Error('Situation not found');
    }
    const result = await updateExistingSituation(tx, existingSituation, situationData, entiteId, changedById);
    newAssignedEntiteIds = result.newAssignedEntiteIds;
    newDirectionServiceIds = result.newDirectionServiceIds;
    deletedFilePaths = result.deletedFilePaths;
    await tx.requeteEntite.updateMany({
      where: {
        requeteId,
        entiteId: { in: entiteIdsToUpdate },
      },
      data: {
        statutId: REQUETE_STATUT_TYPES.NOUVEAU,
      },
    });
    updatedRequete = await tx.requete.findUnique({
      where: { id: requeteId },
      include: { situations: { include: SITUATION_INCLUDE_FULL } },
    });
  });

  for (const filePath of deletedFilePaths) {
    await deleteFileFromMinio(filePath);
  }

  if (!updatedRequete) {
    throw new Error('Requete not found after update');
  }

  // Compute should close requete status
  let shouldCloseRequeteStatus: ShouldCloseRequeteStatus | undefined;
  if (userEntityIds && userEntityIds.length > 0) {
    shouldCloseRequeteStatus = await computeShouldCloseRequeteStatus({
      requeteId,
      userEntityIds,
      excludeTopEntiteId: topEntiteId,
    });
  }

  return { requete: updatedRequete, newAssignedEntiteIds, newDirectionServiceIds, shouldCloseRequeteStatus };
};

export const closeRequeteForEntite = async (
  requeteId: string,
  entiteId: string,
  reasonIds: string[],
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

  if (requeteEntite.statutId === REQUETE_STATUT_TYPES.CLOTUREE) {
    throw new Error('READONLY_FOR_ENTITY');
  }

  const uniqueReasonIds = Array.from(new Set(reasonIds));
  const reasons = await prisma.requeteClotureReasonEnum.findMany({
    where: { id: { in: uniqueReasonIds } },
    select: { id: true },
  });

  if (reasons.length !== uniqueReasonIds.length) {
    throw new Error('REASON_INVALID');
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
        clotureReason: {
          connect: uniqueReasonIds.map((id) => ({ id })),
        },
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

    await updateStatusRequete(requeteId, entiteId, REQUETE_STATUT_TYPES.CLOTUREE, tx);

    return {
      etapeId: etape.id,
      closedAt: etape.createdAt.toISOString(),
      noteId,
      etape,
      note,
    };
  });

  await createChangeLogForRequeteEntite({
    requeteId,
    entiteId,
    action: ChangeLogAction.UPDATED,
    before: { statutId: requeteEntite.statutId } as Prisma.JsonObject,
    after: {
      statutId: REQUETE_STATUT_TYPES.CLOTUREE,
      clotureReasonIds: uniqueReasonIds,
      precision: precision?.trim() || null,
      ...(fileIds && fileIds.length > 0 ? { fileIds } : {}),
    } as Prisma.JsonObject,
    changedById: authorId,
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
      clotureReasonIds: uniqueReasonIds,
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

export const reopenRequeteForEntite = async (requeteId: string, entiteId: string, authorId: string) => {
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

  if (requeteEntite.statutId !== REQUETE_STATUT_TYPES.CLOTUREE) {
    throw new Error('REQUETE_NOT_CLOSED');
  }

  const result = await prisma.$transaction(async (tx) => {
    const etape = await tx.requeteEtape.create({
      data: {
        requeteId,
        entiteId,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        type: REQUETE_ETAPE_TYPES.REOPEN,
        createdById: authorId,
        nom: `Requête rouverte le ${new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}`,
      },
    });

    await updateStatusRequete(requeteId, entiteId, REQUETE_STATUT_TYPES.EN_COURS, tx);

    return {
      etapeId: etape.id,
      reopenedAt: etape.createdAt.toISOString(),
      etape,
    };
  });

  await createChangeLogForRequeteEntite({
    requeteId,
    entiteId,
    action: ChangeLogAction.UPDATED,
    before: { statutId: REQUETE_STATUT_TYPES.CLOTUREE } as Prisma.JsonObject,
    after: { statutId: REQUETE_STATUT_TYPES.EN_COURS } as Prisma.JsonObject,
    changedById: authorId,
  });

  return result;
};

export const updateStatusRequete = async (
  requeteId: string,
  entiteId: string,
  statut: RequeteStatutType,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx ?? prisma;
  const requeteEntite = await db.requeteEntite.update({
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

export const createChangeLogForRequeteEntite = async ({
  requeteId,
  entiteId,
  action,
  before,
  after,
  changedById,
}: CreateChangeLogForRequeteEntiteDto) => {
  await createChangeLog({
    entity: 'RequeteEntite',
    entityId: `${requeteId}:${entiteId}`,
    action,
    before,
    after,
    changedById,
  });
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
    await createChangeLogForRequeteEntite({
      requeteId,
      entiteId,
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

const isPdf = (file: UploadedFile): boolean => file.mimeType === 'application/pdf';

const needsAttentionPrefix = (file: UploadedFile): boolean => {
  if (file.scanStatus !== 'CLEAN' && file.scanStatus !== 'INFECTED') return true;
  if (isPdf(file) && !file.safeFilePath) return true;
  return false;
};

export const getPrefixedFileName = (file: UploadedFile): string => {
  const originalName = getOriginalFileName(file).replace(/[/\\]/g, '_');
  if (file.scanStatus === 'INFECTED') return `[DANGER] ${originalName}`;
  if (needsAttentionPrefix(file)) return `[ATTENTION] ${originalName}`;
  return originalName;
};

export const deduplicateFileName = (name: string, usedNames: Set<string>): string => {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  const dotIndex = name.lastIndexOf('.');
  const baseName = dotIndex === -1 ? name : name.slice(0, dotIndex);
  const ext = dotIndex === -1 ? '' : name.slice(dotIndex);

  let counter = 1;
  let candidate = `${baseName} (${counter})${ext}`;
  while (usedNames.has(candidate)) {
    counter++;
    candidate = `${baseName} (${counter})${ext}`;
  }

  usedNames.add(candidate);
  return candidate;
};

export const collectRequeteFiles = (requeteEntite: NonNullable<Awaited<ReturnType<typeof getRequeteEntiteById>>>) => {
  const rootFiles = (requeteEntite.requete?.fichiersRequeteOriginale ?? []).filter((f) => f.size > 0);

  const situationFiles: { folderName: string; file: UploadedFile }[] = [];
  const situations = requeteEntite.requete?.situations ?? [];
  for (const [index, situation] of situations.entries()) {
    const folderName = `Situation ${index + 1}`;
    const faits = situation.faits ?? [];
    for (const fait of faits) {
      for (const file of fait.fichiers ?? []) {
        if (file.size > 0) {
          situationFiles.push({ folderName, file });
        }
      }
    }
  }

  return { rootFiles, situationFiles };
};

export const createRequeteFilesArchive = async (requeteId: string, entiteId: string) => {
  const requeteEntite = await getRequeteEntiteById(requeteId, entiteId);
  if (!requeteEntite) {
    return null;
  }

  const { rootFiles, situationFiles } = collectRequeteFiles(requeteEntite);

  if (rootFiles.length === 0 && situationFiles.length === 0) {
    return 'NO_FILES' as const;
  }

  const archive = archiver('zip', { store: true });
  const usedNames = new Set<string>();

  const appendFileToArchive = async (file: UploadedFile, entryName: string) => {
    const filePath = isPdf(file) && file.safeFilePath ? file.safeFilePath : file.filePath;
    try {
      const { stream } = await getFileStream(filePath);
      archive.append(stream, { name: entryName, date: file.createdAt });
    } catch {
      archive.append(Buffer.from('Fichier indisponible'), { name: `${entryName}.erreur.txt` });
    }
  };

  for (const file of rootFiles) {
    const prefixedName = getPrefixedFileName(file);
    const uniqueName = deduplicateFileName(prefixedName, usedNames);
    await appendFileToArchive(file, uniqueName);
  }

  const folderUsedNamesMap = new Map<string, Set<string>>();
  for (const { folderName, file } of situationFiles) {
    if (!folderUsedNamesMap.has(folderName)) {
      folderUsedNamesMap.set(folderName, new Set<string>());
    }
    const folderUsedNames = folderUsedNamesMap.get(folderName) ?? new Set<string>();
    const prefixedName = getPrefixedFileName(file);
    const uniqueName = deduplicateFileName(prefixedName, folderUsedNames);
    await appendFileToArchive(file, `${folderName}/${uniqueName}`);
  }

  archive.finalize();

  return { archive, requeteId: requeteEntite.requeteId };
};

const booleanLabel = (value: boolean | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  return value ? 'Oui' : 'Non';
};

const formatRue = (adresse: { numero: string | null; rue: string | null } | null) =>
  adresse ? [adresse.numero, adresse.rue].filter(Boolean).join(' ') || null : null;

const groupMotifsByParent = (motifs: { motifId: string }[]): { label: string; children: string[] }[] => {
  const grouped = new Map<string, { label: string; children: string[] }>();

  for (const { motifId } of motifs) {
    const [parentValue, childValue] = motifId.split('/');
    if (!parentValue || !childValue) continue;

    const parent = MOTIFS_HIERARCHICAL_DATA.find((p) => p.value === parentValue);
    if (!parent) continue;

    const child = parent.children.find((c) => c.value === childValue);
    if (!child) continue;

    if (!grouped.has(parentValue)) {
      grouped.set(parentValue, { label: parent.label, children: [] });
    }

    grouped.get(parentValue)?.children.push(child.label);
  }

  return Array.from(grouped.values());
};

export const generateRequetePdfBuffer = async (requeteId: string, entiteId: string | null): Promise<Buffer | null> => {
  if (!entiteId) return null;

  const result = await prisma.requeteEntite.findFirst({
    where: { requeteId, entiteId },
    include: {
      statut: true,
      priorite: true,
      requete: {
        include: {
          receptionType: true,
          provenance: true,
          declarant: {
            include: {
              identite: { include: { civilite: true } },
              adresse: true,
              lienVictime: true,
            },
          },
          participant: {
            include: {
              identite: { include: { civilite: true } },
              adresse: true,
              age: true,
              lienVictime: true,
            },
          },
          fichiersRequeteOriginale: true,
          situations: { include: SITUATION_INCLUDE_FULL },
        },
      },
    },
  });

  if (!result) return null;

  const enrichedSituations = await Promise.all(
    result.requete?.situations?.map((s) => enrichSituationWithTraitementDesFaits(s)) ?? [],
  );

  const requeteEntite = { ...result, requete: { ...result.requete, situations: enrichedSituations } };
  const { requete } = requeteEntite;

  const pdf = new RequetePdfBuilder(`Requête ${requete.id}`);

  // ===== 1. HEADERS =====
  const allMaltraitanceTypes = (requete.situations ?? [])
    .flatMap(
      (s) =>
        s.faits?.[0]?.maltraitanceTypes
          ?.filter((mt) => mt.maltraitanceType.id !== 'NON')
          .map((mt) => `${mt.maltraitanceType.label} (maltraitance)`) ?? [],
    )
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const allMotifsDeclaratifs = [
    ...allMaltraitanceTypes,
    ...(requete.situations ?? [])
      .flatMap((s) => s.faits?.[0]?.motifsDeclaratifs?.map((m) => m.motifDeclaratif.label) ?? [])
      .filter((v, i, arr) => arr.indexOf(v) === i),
  ];

  const allMotifsQualifies = (requete.situations ?? []).flatMap((s) => s.faits?.[0]?.motifs ?? []);
  const allMotifsGrouped = groupMotifsByParent(allMotifsQualifies);

  pdf
    .h1(`Requête ${requete.id}`)
    .field('Statut', requeteEntite.statut?.label || requeteEntite.statutId)
    .field('Priorité', requeteEntite.priorite?.label || null);

  if (allMotifsDeclaratifs.length > 0) {
    pdf.paragraph('Motifs renseignés par le déclarant :', { bold: true });
    pdf.list(allMotifsDeclaratifs);
  }

  if (allMotifsGrouped.length > 0) {
    pdf.paragraph('Motifs qualifiés :', { bold: true });
    pdf.groupedList(allMotifsGrouped);
  }

  pdf.field('Date de génération', formatDateFr(new Date()));

  // ===== 2. REQUÊTE ORIGINALE =====
  pdf
    .section('Requête originale')
    .field('Date de réception', formatDateFr(requete.receptionDate))
    .field('Mode de réception', requete.receptionType?.label || null)
    .field('Provenance', requete.provenance?.label || null)
    .field('Précision provenance', requete.provenancePrecision || null)
    .field('N° Demat.Social', requete.dematSocialId ? String(requete.dematSocialId) : null);

  // ===== 3. DÉCLARANT =====
  if (requete.declarant) {
    const d = requete.declarant;
    if (d.estVictime) {
      pdf.section('Déclarant').paragraph('Le déclarant est la personne concernée par la requête.');
    } else {
      pdf
        .section('Déclarant')
        .field('Civilité', d.identite?.civilite?.label || null)
        .field('Prénom', d.identite?.prenom || null)
        .field('Nom', d.identite?.nom || null)
        .field('Lien avec la victime', d.lienVictime?.label || null)
        .field('Précision lien', d.lienAutrePrecision || null)
        .field('Tuteur/Curateur', booleanLabel(d.isTuteur))
        .field('Adresse', formatRue(d.adresse))
        .field('Code postal', d.adresse?.codePostal || null)
        .field('Ville', d.adresse?.ville || null)
        .field('Email', d.identite?.email || null)
        .field('Téléphone', d.identite?.telephone || null)
        .field(
          'Consent à ce que son identité soit communiquée',
          booleanLabel(
            d.veutGarderAnonymat === null || d.veutGarderAnonymat === undefined ? null : !d.veutGarderAnonymat,
          ),
        )
        .field('Signalement professionnel (EIG)', booleanLabel(d.estSignalementProfessionnel))
        .field('Autres précisions', d.commentaire || null);
    }
  }

  // ===== 4. PERSONNE CONCERNÉE =====
  if (requete.participant) {
    const p = requete.participant;
    pdf
      .section('Personne concernée')
      .field('Civilité', p.identite?.civilite?.label || null)
      .field('Prénom', p.identite?.prenom || null)
      .field('Nom', p.identite?.nom || null)
      .field('Date de naissance', p.dateNaissance ? formatDateFr(p.dateNaissance) : null)
      .field("Tranche d'âge", p.age ? p.age.label : null)
      .field('En situation de handicap', booleanLabel(p.estHandicapee))
      .field('Adresse', formatRue(p.adresse))
      .field('Code postal', p.adresse?.codePostal || null)
      .field('Ville', p.adresse?.ville || null)
      .field('Email', p.identite?.email || null)
      .field('Téléphone', p.identite?.telephone || null)
      .field('A été informé(e) de la démarche par le déclarant', booleanLabel(p.estVictimeInformee))
      .field("Raison pour laquelle elle n'a pas été informée", p.victimeInformeeCommentaire || null)
      .field(
        'Consent à ce que son identité soit communiquée',
        booleanLabel(
          p.veutGarderAnonymat === null || p.veutGarderAnonymat === undefined ? null : !p.veutGarderAnonymat,
        ),
      )
      .field("D'autres personnes sont concernées par la requête", booleanLabel(p.aAutrePersonnes))
      .field('Précisions sur les autres personnes concernées', p.autrePersonnes || null)
      .field('Autres précisions', p.commentaire || null);
  }

  // ===== 5. SITUATIONS =====
  for (const [index, situation] of (requete.situations ?? []).entries()) {
    pdf.section(`Situation ${index + 1}`);

    const lieu = situation.lieuDeSurvenue;
    if (lieu) {
      pdf
        .subsection('Lieu de survenue')
        .field('Type de lieu', lieu.lieuType?.label || null)
        .field('Précision du lieu', lieu.lieuPrecision || null)
        .field('Rue', formatRue(lieu.adresse))
        .field('Code postal', lieu.adresse?.codePostal || lieu.codePostal || null)
        .field('Ville', lieu.adresse?.ville || null)
        .field("Nom de l'établissement", lieu.adresse?.label || lieu.categLib || null)
        .field('Numéro FINESS', lieu.finess || null)
        .field('Société de transport', lieu.societeTransport || null);
    }

    const mec = situation.misEnCause;
    if (mec) {
      pdf
        .subsection('Mis en cause')
        .field('Type', mec.misEnCauseType?.label || null)
        .field('Précision type', mec.misEnCauseTypePrecision?.label || null)
        .field('Civilité du mis en cause', mec.civilite || null)
        .field('Prénom du mis en cause', mec.prenom || null)
        .field('Nom du mis en cause', mec.nom || null)
        .field('N° RPPS', mec.rpps || null)
        .field('Nom du service', mec.nomService || null)
        .field('N° FINESS', mec.finess || null)
        .field('Code postal du mis en cause', mec.codePostal || null)
        .field('Ville du mis en cause', mec.ville || null)
        .field('Précisions supplémentaires', mec.autrePrecision || null)
        .field('Commentaire', mec.commentaire || null);
    }

    const faits = situation.faits?.[0];
    if (faits) {
      const maltraitanceTypes =
        faits.maltraitanceTypes
          ?.filter((mt) => mt.maltraitanceType.id !== 'NON')
          .map((mt) => `${mt.maltraitanceType.label} (maltraitance)`) ?? [];
      const motifsDeclaratifs = [
        ...maltraitanceTypes,
        ...(faits.motifsDeclaratifs?.map((m) => m.motifDeclaratif.label) ?? []),
      ];
      const motifsGrouped = groupMotifsByParent(faits.motifs ?? []);
      const consequences = faits.consequences?.map((c) => c.consequence.label) ?? [];

      if (motifsDeclaratifs.length > 0) {
        pdf.paragraph('Motifs renseignés par le déclarant :', { bold: true });
        pdf.list(motifsDeclaratifs);
      }

      if (motifsGrouped.length > 0) {
        pdf.paragraph('Motifs qualifiés :', { bold: true });
        pdf.groupedList(motifsGrouped);
      } else if (faits.motifs) {
        pdf.paragraph('Motifs qualifiés :', { bold: true });
        pdf.list(['Motif à renseigner']);
      }

      pdf.field('Conséquences', consequences.length > 0 ? consequences.join(', ') : null);

      const periodeLabel =
        faits.dateDebut && !faits.dateFin
          ? `Depuis le ${formatDateFr(faits.dateDebut)}`
          : faits.dateDebut && faits.dateFin
            ? `Du ${formatDateFr(faits.dateDebut)} au ${formatDateFr(faits.dateFin)}`
            : null;

      pdf
        .subsection('Période et description des faits')
        .field('Période', periodeLabel)
        .field('Explication des faits', faits.commentaire || null)
        .field('Autres précisions', faits.autresPrecisions || null);

      const fichiersSituation = faits.fichiers ?? [];
      if (fichiersSituation.length > 0) {
        pdf.subsection('Pièces jointes de la situation').list(fichiersSituation.map(getOriginalFileName));
      }
    }

    const demarches = situation.demarchesEngagees;
    if (demarches?.demarches && demarches.demarches.length > 0) {
      pdf.subsection('Démarches engagées');

      const groups: { label: string; children: string[] }[] = [];

      for (const demarche of demarches.demarches) {
        const children: string[] = [];

        if (demarche.label === demarcheEngageeLabels.CONTACT_RESPONSABLES) {
          const dateContact = formatDateFr(demarches.dateContactEtablissement);
          if (dateContact) {
            children.push(`Date de prise de contact : ${dateContact}`);
          }
          if (demarches.etablissementARepondu) {
            children.push('Le déclarant a reçu une réponse');
          }
        }

        if (demarche.label === demarcheEngageeLabels.CONTACT_ORGANISME && demarches.organisme) {
          children.push(`Précisions sur l'organisme contacté : ${demarches.organisme}`);
        }

        if (demarche.label === demarcheEngageeLabels.PLAINTE) {
          const datePlainte = formatDateFr(demarches.datePlainte);
          if (datePlainte) {
            children.push(`Date du dépôt de plainte : ${datePlainte}`);
          }
          if (demarches.autoriteType?.label) {
            children.push(`Lieu de dépôt de la plainte : ${demarches.autoriteType.label}`);
          }
        }

        groups.push({ label: demarche.label, children });
      }

      pdf.groupedList(groups);

      if (demarches.commentaire) {
        pdf.field('Commentaire', demarches.commentaire);
      }
    }

    const entitesTraitement = situation.traitementDesFaits?.entites ?? [];
    if (entitesTraitement.length > 0) {
      pdf
        .subsection('Traitement')
        .list(
          entitesTraitement.map((e) =>
            e.directionServiceName ? `${e.entiteName} — ${e.directionServiceName}` : e.entiteName,
          ),
        );
    }
  }

  // ===== 6. PIÈCES JOINTES REQUÊTE ORIGINALE =====
  const fichiersRequete = requete.fichiersRequeteOriginale ?? [];
  if (fichiersRequete.length > 0) {
    pdf.section('Pièces jointes de la requête originale').list(fichiersRequete.map(getOriginalFileName));
  }

  return pdf.toBuffer();
};
