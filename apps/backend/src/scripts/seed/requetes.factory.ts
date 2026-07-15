import { RECEPTION_TYPE } from '@sirena/common/constants';
import type { RequeteBlueprint } from './blueprint.js';
import type { SeedContext } from './context.js';
import { buildFamily, FAMILIES } from './families.js';
import { type GeneratedRequete, writeRequete } from './graph.builder.js';

/**
 * Plans the blueprints: one of each family first (guarantees coverage of all
 * cases), then random families to reach `count`.
 */
const planRequetes = (count: number, ctx: SeedContext): RequeteBlueprint[] => {
  const blueprints = FAMILIES.slice(0, count).map((family) => buildFamily(family, ctx));

  while (blueprints.length < count) {
    const family = ctx.faker.helpers.arrayElement(FAMILIES);
    blueprints.push(buildFamily(family, ctx));
  }

  return blueprints;
};

/** Retargets a blueprint to a given origin (DematSocial requests look imported). */
const applyOrigin = (bp: RequeteBlueprint, origin: RequeteBlueprint['origin']): RequeteBlueprint => {
  bp.origin = origin;
  if (origin === 'DEMATSOCIAL') {
    bp.receptionType = RECEPTION_TYPE.FORMULAIRE;
  }
  return bp;
};

/** Forces a blueprint (and all its situations) onto a fixed set of entités. */
const forceEntites = (bp: RequeteBlueprint, entiteIds: string[]): RequeteBlueprint => {
  bp.entiteIds = entiteIds;
  for (const situation of bp.situations) {
    situation.entiteIds = entiteIds;
  }
  return bp;
};

/**
 * Manual requests: the full family set on ARS Normandie, the same set on ARS
 * Île-de-France (each pinned to its ARS), plus 1–2 requests shared between both.
 * `perArsCount` is the number of requests generated per ARS (recommended 11).
 */
export const seedManualRequetes = async (perArsCount: number, ctx: SeedContext): Promise<GeneratedRequete[]> => {
  const created: GeneratedRequete[] = [];
  const bothArs = [ctx.entites.normandie.id, ctx.entites.idf.id];

  for (const entiteId of bothArs) {
    const blueprints = planRequetes(perArsCount, ctx).map((bp) => forceEntites(applyOrigin(bp, 'MANUAL'), [entiteId]));
    for (const bp of blueprints) {
      created.push(await writeRequete(bp, ctx));
    }
  }

  const sharedFamily = FAMILIES.find((f) => f.id === 'multi-entites') ?? FAMILIES[0];
  const sharedCount = ctx.faker.number.int({ min: 1, max: 2 });
  for (let i = 0; i < sharedCount; i++) {
    const bp = forceEntites(applyOrigin(buildFamily(sharedFamily, ctx), 'MANUAL'), bothArs);
    created.push(await writeRequete(bp, ctx));
  }

  return created;
};

/**
 * Fake DematSocial requests (RF prefix, dematSocialId set), spread randomly
 * across the two ARS.
 */
export const seedDematSocialRequetes = async (count: number, ctx: SeedContext): Promise<GeneratedRequete[]> => {
  const blueprints = planRequetes(count, ctx).map((bp) => applyOrigin(bp, 'DEMATSOCIAL'));

  const created: GeneratedRequete[] = [];
  for (const bp of blueprints) {
    created.push(await writeRequete(bp, ctx));
  }
  return created;
};
