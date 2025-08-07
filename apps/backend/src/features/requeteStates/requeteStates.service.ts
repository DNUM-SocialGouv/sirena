import { getRequestEntiteById } from '@/features/requetesEntite/requetesEntite.service';
import { prisma } from '@/libs/prisma';
import type { GetRequeteStatesQuery, RequeteStateCreationDto } from './requeteStates.type';

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
