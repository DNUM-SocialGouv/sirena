import { prisma } from '@/libs/prisma';
import type { GetRequetesEntiteQuery } from './requetesEntite.type';

type RequeteEntiteKey = { requeteId: string; entiteId: string };

// TODO handle entiteIds
// TODO handle search
export const getRequetesEntite = async (_entiteIds: string[] | null, query: GetRequetesEntiteQuery = {}) => {
  const { offset = 0, limit, sort = 'requeteId', order = 'desc' } = query;

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
      include: { requete: true, requeteEtape: { orderBy: { createdAt: 'desc' }, take: 1 } },
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

export const getRequeteEntiteById = async ({ requeteId, entiteId }: RequeteEntiteKey) => {
  return await prisma.requeteEntite.findUnique({
    where: { requeteId_entiteId: { requeteId, entiteId } },
    include: {
      requete: true,
      requeteEtape: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
};
