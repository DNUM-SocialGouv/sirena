import type { Pagination } from '@sirena/backend-utils/types';
import { type Entite, prisma } from '@/libs/prisma';
import type { EntiteChain } from './entites.type';

export const getEntiteForUser = async (organizationUnit: string | null, email: string) => {
  if (organizationUnit) {
    const entites = await prisma.entite.findMany({
      where: {
        OR: [
          { organizationUnit },
          { organizationUnit: { startsWith: `${organizationUnit},` } },
          { organizationUnit: { endsWith: `,${organizationUnit}` } },
          { organizationUnit: { contains: `,${organizationUnit},` } },
        ],
      },
    });

    if (entites.length === 1) {
      return entites[0];
    }
    return null;
  }

  const trimmedEmail = email.trim();

  const entite = await prisma.entite.findMany({
    where: {
      emailDomain: trimmedEmail.split('@')[1],
    },
  });
  if (entite.length === 1) {
    return entite[0];
  }
  return null;
};

export const getEntites = async (
  entiteMere: Entite['id'] | null = null,
  { sort = 'nomComplet', order = 'asc', offset = 0, limit, search = '' }: Pagination,
) => {
  const where = {
    entiteMere: entiteMere === null ? null : { is: { id: entiteMere } },
    OR: search
      ? [
          { nomComplet: { contains: search, mode: 'insensitive' as const } },
          { label: { contains: search, mode: 'insensitive' as const } },
        ]
      : undefined,
  };

  const [data, total] = await Promise.all([
    prisma.entite.findMany({
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      where,
      orderBy: {
        [sort]: order,
      },
    }),
    prisma.entite.count({ where }),
  ]);

  return {
    data,
    total,
  };
};

export async function* getEntiteChainGenerator(entiteId: string) {
  let currentId: string | null = entiteId;

  while (currentId) {
    const current: EntiteChain | null = await prisma.entite.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        nomComplet: true,
        entiteMereId: true,
      },
    });

    if (!current) break;

    yield current;

    currentId = current.entiteMereId ?? null;
  }
}

export const getEntiteChain = async (entiteId: string) => {
  const results: { id: string; nomComplet: string }[] = [];

  for await (const entite of getEntiteChainGenerator(entiteId)) {
    results.push(entite);
  }

  return results.reverse();
};

export const getEditableEntitiesChain = async (entiteId: string, editableEntiteIds: string[] | null) => {
  const chain = await getEntiteChain(entiteId);
  const isSuperAdmin = editableEntiteIds === null;

  const shouldDisable = (id: string): boolean => {
    if (isSuperAdmin) return false;
    if (editableEntiteIds.length === 0) return true;
    const isPivot = id === editableEntiteIds[0];
    const isIncluded = editableEntiteIds.includes(id);
    return !isIncluded || isPivot;
  };

  return chain.map((entite) => ({
    ...entite,
    disabled: shouldDisable(entite.id),
  }));
};

export async function* getEntiteDescendantIdsGenerator(entiteId: string) {
  const stack: string[] = [entiteId];

  while (stack.length > 0) {
    const currentId = stack.pop();

    const children = await prisma.entite.findMany({
      where: { entiteMereId: currentId },
      select: { id: true },
    });
    for (const child of children) {
      stack.push(child.id);
    }
    yield children.map((child) => child.id);
  }
}

export const getEntiteDescendantIds = async (entiteId: string | null) => {
  // Should be SUPER_ADMIN
  if (!entiteId) {
    return null;
  }
  const results: string[] = [entiteId];
  for await (const entite of getEntiteDescendantIdsGenerator(entiteId)) {
    results.push(...entite);
  }

  return results;
};
