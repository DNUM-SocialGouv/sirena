import { prisma } from '../../libs/prisma.js';
import { getEntiteChain } from '../entites/entites.service.js';
import type { CreateFeatureFlagDto, PatchFeatureFlagDto } from './featureFlags.type.js';

export const getFeatureFlags = async () => {
  return prisma.featureFlag.findMany({
    orderBy: { name: 'asc' },
  });
};

export const getFeatureFlagById = async (id: string) => {
  return prisma.featureFlag.findUnique({ where: { id } });
};

export const createFeatureFlag = async (data: CreateFeatureFlagDto) => {
  return prisma.featureFlag.create({ data });
};

export const patchFeatureFlag = async (id: string, data: PatchFeatureFlagDto) => {
  return prisma.featureFlag.update({ where: { id }, data });
};

export const deleteFeatureFlag = async (id: string) => {
  return prisma.featureFlag.delete({ where: { id } });
};

const resolveFlag = (
  flag: { enabled: boolean; userEmails: string[]; entiteIds: string[] },
  userEmail: string,
  entiteChainIds: string[],
): boolean => {
  const hasUserTargeting = flag.userEmails.length > 0;
  const hasEntiteTargeting = flag.entiteIds.length > 0;

  if (!hasUserTargeting && !hasEntiteTargeting) {
    return flag.enabled;
  }

  if (hasUserTargeting && flag.userEmails.includes(userEmail)) {
    return true;
  }

  if (hasEntiteTargeting && entiteChainIds.some((id) => flag.entiteIds.includes(id))) {
    return true;
  }

  return false;
};

const getEntiteChainIds = async (entiteId: string | null): Promise<string[]> => {
  if (!entiteId) return [];
  const chain = await getEntiteChain(entiteId);
  return chain.map((e) => e.id);
};

export const resolveFeatureFlags = async (
  userEmail: string,
  entiteId: string | null,
): Promise<Record<string, boolean>> => {
  const [flags, entiteChainIds] = await Promise.all([prisma.featureFlag.findMany(), getEntiteChainIds(entiteId)]);
  const resolved: Record<string, boolean> = {};

  for (const flag of flags) {
    resolved[flag.name] = resolveFlag(flag, userEmail, entiteChainIds);
  }

  return resolved;
};

export const hasFeature = async (
  name: string,
  defaultValue: boolean,
  userEmail: string,
  entiteId: string | null,
): Promise<boolean> => {
  const [flag, entiteChainIds] = await Promise.all([
    prisma.featureFlag.findUnique({ where: { name } }),
    getEntiteChainIds(entiteId),
  ]);

  if (!flag) {
    return defaultValue;
  }

  return resolveFlag(flag, userEmail, entiteChainIds);
};
