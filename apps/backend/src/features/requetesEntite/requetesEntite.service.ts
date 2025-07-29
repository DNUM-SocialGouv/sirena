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
