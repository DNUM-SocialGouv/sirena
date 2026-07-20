import type { Faker } from '@faker-js/faker';
import { ROLES_WRITE } from '@sirena/common/constants';
import { prisma } from '../../libs/prisma.js';
import type { ArsEntites } from './entites.js';
import { resolveArsEntites } from './entites.js';
import { buildFaker } from './faker.helpers.js';
import { loadReferentials, type Referentials } from './referentials.js';

/** A user that can be set as the creator of a manual request. */
export type Agent = { id: string; entiteId: string };

export type SeedContext = {
  faker: Faker;
  refs: Referentials;
  entites: ArsEntites;
  /** Agents per entité id, used as createdBy for manual requests. */
  agentsByEntite: Map<string, Agent[]>;
  now: Date;
};

/**
 * Loads all agents (write-role users attached to an entité) so manual requests
 * can be attributed to a plausible creator.
 */
const loadAgentsByEntite = async (): Promise<Map<string, Agent[]>> => {
  const users = await prisma.user.findMany({
    where: { entiteId: { not: null }, roleId: { in: [...ROLES_WRITE] } },
    select: { id: true, entiteId: true },
  });

  const map = new Map<string, Agent[]>();
  for (const user of users) {
    if (!user.entiteId) continue;
    const list = map.get(user.entiteId) ?? [];
    list.push({ id: user.id, entiteId: user.entiteId });
    map.set(user.entiteId, list);
  }
  return map;
};

/**
 * Builds the context shared by every family and by the graph builder.
 */
export const buildSeedContext = async (fakerSeed: number | null): Promise<SeedContext> => {
  const [refs, entites, agentsByEntite] = await Promise.all([
    loadReferentials(),
    resolveArsEntites(),
    loadAgentsByEntite(),
  ]);

  return {
    faker: buildFaker(fakerSeed),
    refs,
    entites,
    agentsByEntite,
    now: new Date(),
  };
};
