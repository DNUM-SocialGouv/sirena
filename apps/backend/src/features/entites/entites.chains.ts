import { prisma } from '../../libs/prisma.js';
import type { EntiteChain } from './entites.type.js';

export type EntitesHierarchySnapshot = ReadonlyMap<string, EntiteChain>;

const ENTITE_CHAIN_SELECT = {
  id: true,
  nomComplet: true,
  entiteMereId: true,
  label: true,
  entiteTypeId: true,
} as const;

export const getEntitesHierarchySnapshot = async (): Promise<EntitesHierarchySnapshot> => {
  const entites = await prisma.entite.findMany({ select: ENTITE_CHAIN_SELECT });
  return new Map(entites.map((entite) => [entite.id, entite]));
};

export const resolveEntiteChain = (hierarchy: EntitesHierarchySnapshot, entiteId: string): EntiteChain[] => {
  const chain: EntiteChain[] = [];
  const visited = new Set<string>();
  let currentId: string | null = entiteId;

  while (currentId && !visited.has(currentId)) {
    const current = hierarchy.get(currentId);
    if (!current) break;

    visited.add(currentId);
    chain.push(current);
    currentId = current.entiteMereId;
  }

  return chain.reverse();
};
