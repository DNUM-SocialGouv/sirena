import { helpers } from '@sirena/backend-utils';
import { mappers } from '@sirena/common';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { DeclarantDataSchema, PersonneConcerneeDataSchema } from '@sirena/common/schemas';
import type { z } from 'zod';
import { generateRequeteId } from '@/features/requetes/functionalId.service';
import { prisma } from '@/libs/prisma';
import { mapDeclarantToPrismaCreate, mapPersonneConcerneeToPrismaCreate } from './requetesEntite.mapper';
import type { GetRequetesEntiteQuery } from './requetesEntite.type';

type DeclarantInput = z.infer<typeof DeclarantDataSchema>;
type PersonneConcerneeInput = z.infer<typeof PersonneConcerneeDataSchema>;

type RequeteEntiteKey = { requeteId: string; entiteId: string };

// TODO handle entiteIds
// TODO handle search
export const getRequetesEntite = async (_entiteIds: string[] | null, query: GetRequetesEntiteQuery = {}) => {
  const { offset = 0, limit, sort = 'requeteId', order = 'asc' } = query;

  // const entiteFilter = filterByEntities(entiteIds);

  // const where = {
  //   ...(entiteFilter ?? {}),
  // };

  const [data, total] = await Promise.all([
    prisma.requeteEntite.findMany({
      // where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: { [sort]: order },
      include: {
        requete: {
          include: {
            declarant: {
              include: {
                identite: true,
                adresse: true,
              },
            },
          },
        },
        requeteEtape: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.requeteEntite.count({
      /* where */
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
                        create: {
                          label: declarantData.adresseDomicile || '',
                          codePostal: declarantData.codePostal || '',
                          ville: declarantData.ville || '',
                        },
                        update: {
                          label: declarantData.adresseDomicile || '',
                          codePostal: declarantData.codePostal || '',
                          ville: declarantData.ville || '',
                        },
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
                      create: {
                        label: participantData.adresseDomicile || '',
                        codePostal: participantData.codePostal || '',
                        ville: participantData.ville || '',
                      },
                      update: {
                        label: participantData.adresseDomicile || '',
                        codePostal: participantData.codePostal || '',
                        ville: participantData.ville || '',
                      },
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
