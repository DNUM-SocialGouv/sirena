import type { User } from '@/libs/prisma';
import { prisma } from '@/libs/prisma';
import type { GetRequetesEntiteQuery } from './requetesEntite.type';

// const filterByEntities = (entiteIds: string[] | null) => {
//   if (!entiteIds) {
//     return null;
//   }
//   return { entiteId: { in: entiteIds } };
// };

// TODO handle entiteIds
// TODO handle search
export const getRequetesEntite = async (_entiteIds: string[] | null, query: GetRequetesEntiteQuery = {}) => {
  const { offset = 0, limit, sort = 'createdAt', order = 'desc' } = query;

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
      include: { requete: true, requetesEntiteStates: { orderBy: { createdAt: 'desc' }, take: 1 } },
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

export const addProcessingStep = async (requeteEntiteId: string, data: { stepName: string }, _user: User | null) => {
  const requeteEntite = await prisma.requeteEntite.findUnique({
    where: { id: requeteEntiteId },
    include: {
      requetesEntiteStates: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!requeteEntite) {
    throw new Error('Requete entite not found');
  }

  const latestStatutId = requeteEntite.requetesEntiteStates[0]?.statutId || 'EN_COURS';

  const newStep = await prisma.requeteState.create({
    data: {
      requeteEntiteId,
      stepName: data.stepName,
      stepStatus: 'A_FAIRE',
      statutId: latestStatutId,
    },
  });

  return newStep;
};

export const getProcessingSteps = async (requeteEntiteId: string) => {
  const steps = await prisma.requeteState.findMany({
    where: {
      requeteEntiteId,
      stepName: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  });

  return steps;
};
