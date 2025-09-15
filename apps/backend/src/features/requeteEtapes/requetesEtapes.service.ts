import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { PinoLogger } from 'hono-pino';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getRequeteEntiteById } from '@/features/requetesEntite/requetesEntite.service';
import { deleteFileFromMinio } from '@/libs/minio';
import type { Prisma } from '@/libs/prisma';
import { prisma, type RequeteEtape } from '@/libs/prisma';
import type {
  CreateRequeteEtapeNoteDto,
  GetRequeteEtapesQuery,
  RequeteEtapeCreationDto,
  UpdateRequeteEtapeNomDto,
  UpdateRequeteEtapeStatutDto,
} from './requetesEtapes.type';

export const addProcessingEtape = async (requeteId: string, entiteId: string, data: RequeteEtapeCreationDto) => {
  const requeteEntite = await getRequeteEntiteById({ requeteId, entiteId });
  if (!requeteEntite) {
    return null;
  }

  const etape = await prisma.requeteEtape.create({
    data: {
      requeteId,
      entiteId,
      nom: data.nom,
      statutId: REQUETE_STATUT_TYPES.A_FAIRE,
    },
  });

  return etape;
};

export const getRequeteEtapes = async (requeteId: string, entiteId: string, query: GetRequeteEtapesQuery) => {
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
        createdAt: true,
        updatedAt: true,
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

export const getNoteById = async (id: string) =>
  await prisma.requeteEtapeNote.findUnique({
    where: { id },
    include: {
      uploadedFiles: true,
    },
  });

export const addNote = async (data: CreateRequeteEtapeNoteDto) =>
  await prisma.requeteEtapeNote.create({
    data: {
      authorId: data.userId,
      texte: data.texte,
      requeteEtapeId: data.requeteEtapeId,
      uploadedFiles: {
        connect: data.fileIds.map((fileId) => ({ id: fileId })),
      },
    },
  });

export const updateNote = async (noteId: string, texte: string) =>
  await prisma.requeteEtapeNote.update({
    where: { id: noteId },
    data: { texte },
  });

export const deleteNote = async (noteId: string, logger: PinoLogger, changedById?: string) => {
  const note = await prisma.requeteEtapeNote.findUnique({
    where: { id: noteId },
    include: { uploadedFiles: true },
  });

  if (!note) {
    return;
  }

  const files = note.uploadedFiles;
  const filePaths = files.map((f) => f.filePath);

  await prisma.requeteEtapeNote.delete({ where: { id: noteId } });

  if (changedById) {
    // Create changelogs for  files (individual entities)
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

    // Create changelog for the RequeteEtapeNote
    try {
      await createChangeLog({
        entity: 'RequeteEtapeNote',
        entityId: noteId,
        action: ChangeLogAction.DELETED,
        before: note as unknown as Prisma.JsonObject,
        after: {},
        changedById,
      });
    } catch (err) {
      logger.error({ err, noteId }, 'Failed to create changelog for requeteEtapeNote');
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

    // Create changelog for the complete RequeteEtape (all other entities)
    const { notes: _, ...requeteEtapeWithoutNotes } = requeteEtape;

    try {
      await createChangeLog({
        entity: 'RequeteEtape',
        entityId: id,
        action: ChangeLogAction.DELETED,
        before: requeteEtapeWithoutNotes as unknown as Prisma.JsonObject,
        after: {},
        changedById,
      });
    } catch (err) {
      logger.error({ err, requeteEtapeId: id }, 'Failed to create changelog for requeteEtape');
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
