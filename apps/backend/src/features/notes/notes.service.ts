import type { PinoLogger } from 'hono-pino';
import { deleteFileFromMinio } from '../../libs/minio.js';
import type { Prisma } from '../../libs/prisma.js';
import { prisma } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';

export const getNoteById = async (id: string) =>
  await prisma.requeteEtapeNote.findUnique({
    where: { id },
    include: {
      uploadedFiles: true,
    },
  });

export const addNote = async (data: { userId: string; requeteEtapeId: string; texte: string; fileIds: string[] }) =>
  await prisma.requeteEtapeNote.create({
    data: {
      authorId: data.userId,
      texte: data.texte,
      requeteEtapeId: data.requeteEtapeId,
      uploadedFiles: {
        connect: data.fileIds.map((fileId: string) => ({ id: fileId })),
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
