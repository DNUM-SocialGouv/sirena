import { prisma } from '@/libs/prisma';
import type { GetRequetesEntiteQuery } from './requetesEntite.type';

type RequeteEntiteKey = { requeteId: string; entiteId: string };

// TODO handle entiteIds
// TODO handle search
export const getRequetesEntite = async (_entiteIds: string[] | null, query: GetRequetesEntiteQuery = {}) => {
  const { offset = 0, limit, sort = 'id', order = 'asc' } = query;

  // const entiteFilter = filterByEntities(entiteIds);

  // const where = {
  //   ...(entiteFilter ?? {}),
  // };

  const [data, total] = await Promise.all([
    prisma.requeteEntite.findMany({
      // where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: { requete: { [sort]: order } },
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

export const generateRequeteId = async (isFromDematSocial = false): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const source = isFromDematSocial ? 'D' : 'S';

  // Find the last requete with the same prefix to get the next counter
  const prefix = `R${source}-${year}-${month}-`;
  const lastRequete = await prisma.requete.findFirst({
    where: {
      id: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: 'desc',
    },
  });

  let counter = 1;
  if (lastRequete) {
    const lastCounter = parseInt(lastRequete.id.split('-').pop() || '0', 10);
    counter = lastCounter + 1;
  }

  return `${prefix}${counter}`;
};

export const createRequeteEntite = async (entiteId: string) => {
  const requeteId = await generateRequeteId(false);

  const requete = await prisma.requete.create({
    data: {
      id: requeteId,
      receptionDate: new Date(),
      receptionTypeId: 'EMAIL',
      requeteEntites: {
        create: {
          entiteId,
        },
      },
    },
    include: {
      requeteEntites: true,
    },
  });

  return requete;
};
