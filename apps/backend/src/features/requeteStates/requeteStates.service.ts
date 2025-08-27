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
                firstName: true,
                lastName: true,
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

export const deleteRequeteState = async (id: string, logger: PinoLogger, changedById?: string): Promise<void> => {
  const { notes, files, filePaths } = await prisma.$transaction(async (tx) => {
    const requeteState = await tx.requeteState.findUnique({
      where: { id },
      include: {
        notes: { include: { uploadedFiles: true } },
      },
    });

    if (!requeteState) {
      return { notes: [], files: [], filePaths: [] };
    }

    const notes = requeteState.notes.map(({ uploadedFiles, ...note }) => note);
    const files = requeteState.notes.flatMap((n) => n.uploadedFiles);
    const filePaths = files.map((f) => f.filePath);

    const noteIds = notes.map((n) => n.id);
    if (noteIds.length > 0) {
      await tx.uploadedFile.deleteMany({ where: { requeteStateNoteId: { in: noteIds } } });
    }

    await tx.requeteStateNote.deleteMany({ where: { requeteEntiteStateId: id } });
    await tx.requeteState.delete({ where: { id } });

    return { notes, files, filePaths };
  });

  if (changedById && notes.length > 0) {
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

  if (changedById && files.length > 0) {
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
