import { prisma } from '../../libs/prisma.js';

/**
 * Default target ARS, resolved by attribute (type + regLib) rather than by a
 * hardcoded UUID: robust if referential migrations re-seed the entities.
 */
export const ARS_NORMANDIE_REG_LIB = 'Normandie';
export const ARS_IDF_REG_LIB = 'Île-de-France';

export type ResolvedEntite = { id: string; nomComplet: string; regLib: string };

/**
 * Resolves the top-level ARS of a region. `entiteMereId: null` targets the ARS
 * itself, never one of its child directions/services (which are also type ARS).
 * Throws a clear error if missing (rather than a FK violation later in the seed).
 */
export const resolveArsByRegLib = async (regLib: string): Promise<ResolvedEntite> => {
  const entite = await prisma.entite.findFirst({
    where: { entiteTypeId: 'ARS', regLib, entiteMereId: null },
    select: { id: true, nomComplet: true, regLib: true },
  });

  if (!entite) {
    throw new Error(`ARS introuvable pour regLib="${regLib}". Les entités sont-elles bien seedées (migrations) ?`);
  }

  return { id: entite.id, nomComplet: entite.nomComplet, regLib: entite.regLib ?? regLib };
};

export type ArsEntites = {
  normandie: ResolvedEntite;
  idf: ResolvedEntite;
};

/**
 * Resolves the two ARS used by the default users.
 */
export const resolveArsEntites = async (): Promise<ArsEntites> => {
  const [normandie, idf] = await Promise.all([
    resolveArsByRegLib(ARS_NORMANDIE_REG_LIB),
    resolveArsByRegLib(ARS_IDF_REG_LIB),
  ]);
  return { normandie, idf };
};
