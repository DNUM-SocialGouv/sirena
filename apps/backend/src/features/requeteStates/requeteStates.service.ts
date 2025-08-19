import { getRequestEntiteById } from '@/features/requetesEntite/requetesEntite.service';
import { prisma, type RequeteState } from '@/libs/prisma';
import type {
  CreateRequeteStateNoteDto,
  GetRequeteStatesQuery,
  RequeteStateCreationDto,
  UpdateRequeteStateStatutDto,
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
      statutId: 'EN_COURS',
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

  const [data, total] = await Promise.all([
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
            author: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        requeteEntiteId: true,
      },
    }),
    prisma.requeteState.count({
      where,
    }),
  ]);

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

export const addNote = async (data: CreateRequeteStateNoteDto) =>
  await prisma.requeteStateNote.create({
    data: {
      authorId: data.userId,
      content: data.content,
      requeteEntiteStateId: data.requeteEntiteStateId,
    },
  });
