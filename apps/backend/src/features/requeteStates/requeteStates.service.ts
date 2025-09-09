import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { PinoLogger } from 'hono-pino';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getRequestEntiteById } from '@/features/requetesEntite/requetesEntite.service';
import { deleteFileFromMinio } from '@/libs/minio';
import type { Prisma } from '@/libs/prisma';
import { prisma, type RequeteState } from '@/libs/prisma';
import type {
  CreateRequeteStateNoteDto,
  GetRequeteStatesQuery,
  RequeteStateCreationDto,
  UpdateRequeteStateStatutDto,
  UpdateRequeteStateStepNameDto,
} from './requeteStates.type';

export const addProcessingState = async (requeteEntiteId: string, data: RequeteStateCreationDto) => {
  const requeteEntite = await getRequestEntiteById(requeteEntiteId);
  if (!requeteEntite) {
    return null;
  }

  const newStep = await prisma.requeteState.create({
    data: {
      requeteEntiteId,
      stepName: data.stepName,
      statutId: REQUETE_STATUT_TYPES.A_FAIRE,
    },
  });

  return newStep;
};

export const getRequeteStates = async (requeteEntiteId: string, query: GetRequeteStatesQuery) => {
  const { offset = 0, limit, sort = 'createdAt', order = 'desc' } = query;

  const where = {
    requeteEntiteId,
    stepName: { not: null },
  };

  const [raw, total] = await Promise.all([
    prisma.requeteState.findMany({
      where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: { [sort]: order },
      select: {
        id: true,
        stepName: true,
        statutId: true,
        createdAt: true,
        updatedAt: true,
        notes: {
          select: {
            id: true,
            content: true,
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
        requeteEntiteId: true,
      },
    }),
    prisma.requeteState.count({
      where,
    }),
  ]);

  const data = raw.map((rs) => ({
    ...rs,
    notes: rs.notes.map((n) => ({
      ...n,
      uploadedFiles: n.uploadedFiles.map((f) => {
        const m = f.metadata as Prisma.JsonObject;
        return {
          id: f.id,
          size: f.size,
          originalName: (m?.originalName as string) ?? 'Unknown',
        };
      }),
    })),
  }));

  return {
    data,
    total,
  };
};

export const getRequeteStateById = async (id: string) =>
  await prisma.requeteState.findUnique({
    where: { id },
  });

export const updateRequeteStateStatut = async (
  id: string,
  data: UpdateRequeteStateStatutDto,
): Promise<RequeteState | null> => {
  const requeteState = await getRequeteStateById(id);
  if (!requeteState) {
    return null;
  }

  const updatedRequeteState = await prisma.requeteState.update({
    where: { id },
    data: {
      statutId: data.statutId,
    },
  });

  return updatedRequeteState;
};

export const updateRequeteStateStepName = async (
  id: string,
  data: UpdateRequeteStateStepNameDto,
): Promise<RequeteState | null> => {
  const requeteState = await getRequeteStateById(id);
  if (!requeteState) {
    return null;
  }

  return prisma.requeteState.update({
    where: { id },
    data: {
      stepName: data.stepName,
    },
  });
};

export const getNoteById = async (id: string) =>
  await prisma.requeteStateNote.findUnique({
    where: { id },
    include: {
      uploadedFiles: true,
    },
  });

export const addNote = async (data: CreateRequeteStateNoteDto) =>
  await prisma.requeteStateNote.create({
    data: {
      authorId: data.userId,
      content: data.content,
      requeteEntiteStateId: data.requeteEntiteStateId,
      uploadedFiles: {
        connect: data.fileIds.map((fileId) => ({ id: fileId })),
      },
    },
  });

export const updateNote = async (noteId: string, content: string) =>
  await prisma.requeteStateNote.update({
    where: { id: noteId },
    data: { content },
  });

export const deleteNote = async (noteId: string, logger: PinoLogger, changedById?: string) => {
  const note = await prisma.requeteStateNote.findUnique({
    where: { id: noteId },
    include: { uploadedFiles: true },
  });

  if (!note) {
    return;
  }

  const files = note.uploadedFiles;
  const filePaths = files.map((f) => f.filePath);

  await prisma.requeteStateNote.delete({ where: { id: noteId } });

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

    // Create changelog for the RequeteStateNote
    try {
      await createChangeLog({
        entity: 'RequeteStateNote',
        entityId: noteId,
        action: ChangeLogAction.DELETED,
        before: note as unknown as Prisma.JsonObject,
        after: {},
        changedById,
      });
    } catch (err) {
      logger.error({ err, noteId }, 'Failed to create changelog for requeteStateNote');
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

export const deleteRequeteState = async (id: string, logger: PinoLogger, changedById?: string): Promise<void> => {
  const requeteState = await prisma.requeteState.findUnique({
    where: { id },
    include: {
      notes: { include: { uploadedFiles: true } },
      declarant: true,
      infoComplementaire: true,
      demarchesEngagees: true,
      victimes: true,
      lieuxIncident: true,
      misEnCauses: true,
      descriptionFaits: {
        include: {
          motifs: true,
          consequences: true,
          maltraitanceTypes: true,
        },
      },
    },
  });

  if (!requeteState) {
    return;
  }

  const notes = requeteState.notes.map(({ uploadedFiles, ...note }) => note);
  const files = requeteState.notes.flatMap((n) => n.uploadedFiles);
  const filePaths = files.map((f) => f.filePath);

  // Delete RequeteState (all related entities will be deleted in cascade)
  await prisma.requeteState.delete({ where: { id } });

  if (changedById) {
    // Create changelogs for notes and files (individual entities)
    if (notes.length > 0) {
      await Promise.allSettled(
        notes.map(async (note) => {
          try {
            await createChangeLog({
              entity: 'RequeteStateNote',
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

    // Create changelog for the complete RequeteState (all other entities)
    const { notes: _, ...requeteStateWithoutNotes } = requeteState;

    try {
      await createChangeLog({
        entity: 'RequeteState',
        entityId: id,
        action: ChangeLogAction.DELETED,
        before: requeteStateWithoutNotes as unknown as Prisma.JsonObject,
        after: {},
        changedById,
      });
    } catch (err) {
      logger.error({ err, requeteStateId: id }, 'Failed to create changelog for requeteState');
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
