import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { PinoLogger } from 'hono-pino';
import { deleteFileFromMinio } from '../../libs/minio.js';
import type { Prisma } from '../../libs/prisma.js';
import { prisma, type RequeteEtape } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import type {
  GetRequeteEtapesQuery,
  RequeteEtapeCreationDto,
  UpdateRequeteEtapeNomDto,
  UpdateRequeteEtapeStatutDto,
} from './requetesEtapes.type.js';

export const createDefaultRequeteEtapes = async (
  requeteId: string,
  entiteId: string,
  receptionDate: Date,
  tx?: Prisma.TransactionClient,
) => {
  const prismaClient = tx ?? prisma;

  // Ensure RequeteEntite exists
  const requeteEntite = await prismaClient.requeteEntite.findUnique({
    where: {
      requeteId_entiteId: {
        requeteId,
        entiteId,
      },
    },
  });

  if (!requeteEntite) {
    return null;
  }

  // Check default step already created
  const existingEtapes = await prismaClient.requeteEtape.findMany({
    where: {
      requeteId,
      entiteId,
    },
  });

  if (existingEtapes.length > 0) {
    return null;
  }

  const etape1 = await prismaClient.requeteEtape.create({
    data: {
      requeteId: requeteId,
      entiteId: entiteId,
      statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
      nom: `Création de la requête le ${
        receptionDate?.toLocaleDateString('fr-FR', {
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

  const etape2 = await prismaClient.requeteEtape.create({
    data: {
      requeteId: requeteId,
      entiteId: entiteId,
      statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
      nom: 'Envoyer un accusé de réception au déclarant',
    },
  });

  return { etape1, etape2 };
};

export const addProcessingEtape = async (
  requeteId: string,
  entiteId: string | null,
  data: RequeteEtapeCreationDto,
  userId?: string,
) => {
  if (!entiteId) {
    return null;
  }

  // First check if the requete exists
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
  });

  if (!requete) {
    return null;
  }

  // Ensure RequeteEntite exists (create if not)
  await prisma.requeteEntite.upsert({
    where: {
      requeteId_entiteId: {
        requeteId,
        entiteId,
      },
    },
    create: {
      requeteId,
      entiteId,
      statutId: REQUETE_STATUT_TYPES.NOUVEAU,
    },
    update: {},
  });

  const etape = await prisma.requeteEtape.create({
    data: {
      requeteId,
      entiteId,
      nom: data.nom,
      statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
      createdById: userId,
    },
  });

  return etape;
};

export const getRequeteEtapes = async (requeteId: string, entiteId: string | null, query: GetRequeteEtapesQuery) => {
  if (!entiteId) {
    return { data: [], total: 0 };
  }

  const { offset = 0, limit, sort = 'createdAt', order = 'desc' } = query;

  const where = {
    requeteId,
    entiteId,
  };

  const [raw, total] = await Promise.all([
    prisma.requeteEtape.findMany({
      where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: { [sort]: order },
      select: {
        id: true,
        nom: true,
        statutId: true,
        clotureReason: {
          select: {
            label: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            prenom: true,
            nom: true,
          },
        },
        notes: {
          select: {
            id: true,
            texte: true,
            createdAt: true,
            uploadedFiles: {
              select: {
                id: true,
                size: true,
                metadata: true,
              },
            },
            author: {
              select: {
                prenom: true,
                nom: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        requeteId: true,
        entiteId: true,
      },
    }),
    prisma.requeteEtape.count({
      where,
    }),
  ]);

  return {
    data: raw,
    total,
  };
};

export const getRequeteEtapeById = async (id: string) =>
  await prisma.requeteEtape.findUnique({
    where: { id },
  });

export const updateRequeteEtapeStatut = async (
  id: string,
  data: UpdateRequeteEtapeStatutDto,
): Promise<RequeteEtape | null> => {
  const requeteEtape = await getRequeteEtapeById(id);
  if (!requeteEtape) {
    return null;
  }

  const updatedRequeteEtape = await prisma.requeteEtape.update({
    where: { id },
    data: {
      statutId: data.statutId,
    },
  });

  return updatedRequeteEtape;
};

export const updateRequeteEtapeNom = async (
  id: string,
  data: UpdateRequeteEtapeNomDto,
): Promise<RequeteEtape | null> => {
  const requeteEtape = await getRequeteEtapeById(id);
  if (!requeteEtape) {
    return null;
  }

  return prisma.requeteEtape.update({
    where: { id },
    data: {
      nom: data.nom,
    },
  });
};

export const deleteRequeteEtape = async (id: string, logger: PinoLogger, changedById?: string): Promise<void> => {
  const requeteEtape = await prisma.requeteEtape.findUnique({
    where: { id },
    include: {
      notes: { include: { uploadedFiles: true } },
    },
  });

  if (!requeteEtape) {
    return;
  }

  const notes = requeteEtape.notes.map(({ uploadedFiles, ...note }) => note);
  const files = requeteEtape.notes.flatMap((n) => n.uploadedFiles);
  const filePaths = files.map((f) => f.filePath);

  // Delete RequeteEtape (all related entities will be deleted in cascade)
  await prisma.requeteEtape.delete({ where: { id } });

  if (changedById) {
    // Create changelogs for notes and files (individual entities)
    if (notes.length > 0) {
      await Promise.allSettled(
        notes.map(async (note) => {
          try {
            await createChangeLog({
              entity: 'RequeteEtapeNote',
              entityId: note.id,
              action: ChangeLogAction.DELETED,
              before: note as unknown as Prisma.JsonObject,
              after: {},
              changedById,
            });
          } catch (err) {
            logger.error({ err, noteId: note.id }, 'Failed to create changelog for note');
          }
        }),
      );
    }

    if (files.length > 0) {
      await Promise.allSettled(
        files.map(async (file) => {
          try {
            await createChangeLog({
              entity: 'UploadedFile',
              entityId: file.id,
              action: ChangeLogAction.DELETED,
              before: file as unknown as Prisma.JsonObject,
              after: {},
              changedById,
            });
          } catch (err) {
            logger.error({ err, fileId: file.id }, 'Failed to create changelog for file');
          }
        }),
      );
    }
  }

  // Delete physical files from MinIO
  if (filePaths.length > 0) {
    await Promise.allSettled(
      filePaths.map(async (filePath) => {
        try {
          await deleteFileFromMinio(filePath);
        } catch (err) {
          logger.error({ err, filePath }, 'Failed to delete MinIO file');
        }
      }),
    );
  }
};
