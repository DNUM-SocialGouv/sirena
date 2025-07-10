import type { Pagination } from '@sirena/backend-utils/types';
import { type DematSocialMapping, prisma } from '@/libs/prisma';
import type { PatchDematSocialMappingDto } from './dematSocialMapping.type';

export const getDematSocialMappings = async ({
  sort = 'key',
  order = 'asc',
  offset = 0,
  limit,
  search = '',
}: Pagination) => {
  const where = {
    OR: search
      ? [
          { dematSocialId: { contains: search, mode: 'insensitive' as const } },
          { key: { contains: search, mode: 'insensitive' as const } },
          { label: { contains: search, mode: 'insensitive' as const } },
          { comment: { contains: search, mode: 'insensitive' as const } },
        ]
      : undefined,
  };

  const [data, total] = await Promise.all([
    prisma.dematSocialMapping.findMany({
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      where,
      orderBy: {
        [sort]: order,
      },
    }),
    prisma.dematSocialMapping.count({ where }),
  ]);

  return {
    data,
    total,
  };
};

export const getDematSocialMappingById = async (id: DematSocialMapping['id']) =>
  await prisma.dematSocialMapping.findUnique({ where: { id } });

export const patchDematSocialMapping = async (id: DematSocialMapping['id'], data: PatchDematSocialMappingDto) => {
  return prisma.dematSocialMapping.update({
    where: { id },
    data: {
      ...data,
    },
  });
};
