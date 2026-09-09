import { prisma } from '../../libs/prisma.js';
import { GEO_GUARDS } from './geoReferentiel.constant.js';
import { inseePostalKey } from './geoReferentiel.parser.js';
import type { CommuneRow, InseePostalRow, WriteResult } from './geoReferentiel.type.js';

type StoredInseePostal = InseePostalRow & { id: string };

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

const communeChanged = (existing: CommuneRow, next: CommuneRow) =>
  existing.comLib !== next.comLib ||
  existing.metomerLib !== next.metomerLib ||
  existing.ctcdCodeActuel !== next.ctcdCodeActuel ||
  existing.ctcdLibActuel !== next.ctcdLibActuel ||
  existing.dptCodeActuel !== next.dptCodeActuel ||
  existing.dptLibActuel !== next.dptLibActuel ||
  existing.regCodeActuel !== next.regCodeActuel ||
  existing.regLibActuel !== next.regLibActuel;

const inseePostalChanged = (existing: StoredInseePostal, next: InseePostalRow) =>
  existing.nomCommune !== next.nomCommune ||
  existing.libelleAcheminement !== next.libelleAcheminement ||
  existing.ligne5 !== next.ligne5;

export const loadExistingCommunes = async (): Promise<Map<string, CommuneRow>> => {
  const rows = await prisma.commune.findMany({
    select: {
      comCode: true,
      comLib: true,
      metomerLib: true,
      ctcdCodeActuel: true,
      ctcdLibActuel: true,
      dptCodeActuel: true,
      dptLibActuel: true,
      regCodeActuel: true,
      regLibActuel: true,
    },
  });

  return new Map(rows.map((row) => [row.comCode, row]));
};

export const loadExistingInseePostal = async (): Promise<Map<string, StoredInseePostal>> => {
  const rows = await prisma.inseePostal.findMany({
    select: {
      id: true,
      codeInsee: true,
      nomCommune: true,
      codePostal: true,
      libelleAcheminement: true,
      ligne5: true,
    },
  });

  return new Map(rows.map((row) => [inseePostalKey(row.codeInsee, row.codePostal), row]));
};

/**
 * Écrit les communes du référentiel.
 *
 * Aucune commune n'est jamais supprimée : la clé étrangère de `InseePostal` l'interdirait,
 * et la source ne retire pas de commune (elle les bascule en `OBSOLETE`). Les communes
 * présentes en base mais absentes de la source sont donc conservées et seulement comptées.
 */
export const writeCommunes = async (
  sourceRows: ReadonlyMap<string, CommuneRow>,
  existing: ReadonlyMap<string, CommuneRow>,
  options: { dryRun?: boolean } = {},
): Promise<WriteResult & { orphans: number }> => {
  const toCreate: CommuneRow[] = [];
  const toUpdate: CommuneRow[] = [];

  for (const [comCode, row] of sourceRows) {
    const current = existing.get(comCode);
    if (!current) {
      toCreate.push(row);
    } else if (communeChanged(current, row)) {
      toUpdate.push(row);
    }
  }

  if (!options.dryRun) {
    for (const batch of chunk(toCreate, GEO_GUARDS.BATCH_SIZE)) {
      await prisma.commune.createMany({ data: batch, skipDuplicates: true });
    }

    for (const batch of chunk(toUpdate, GEO_GUARDS.BATCH_SIZE)) {
      await prisma.$transaction(
        batch.map(({ comCode, ...data }) => prisma.commune.update({ where: { comCode }, data })),
      );
    }
  }

  let orphans = 0;
  for (const comCode of existing.keys()) {
    if (!sourceRows.has(comCode)) {
      orphans++;
    }
  }

  return { created: toCreate.length, updated: toUpdate.length, deleted: 0, orphans };
};

/**
 * Écrit la correspondance code INSEE / code postal, suppressions comprises.
 *
 * Les suppressions sont volontairement séparées et peuvent être inhibées par l'appelant
 * quand leur volume trahit une source corrompue plutôt qu'une évolution réelle.
 */
export const writeInseePostal = async (
  sourceRows: ReadonlyMap<string, InseePostalRow>,
  existing: ReadonlyMap<string, StoredInseePostal>,
  options: { applyDeletions: boolean; dryRun?: boolean },
): Promise<WriteResult> => {
  const toCreate: InseePostalRow[] = [];
  const toUpdate: Array<{ id: string; row: InseePostalRow }> = [];

  for (const [key, row] of sourceRows) {
    const current = existing.get(key);
    if (!current) {
      toCreate.push(row);
    } else if (inseePostalChanged(current, row)) {
      toUpdate.push({ id: current.id, row });
    }
  }

  const idsToDelete: string[] = [];
  for (const [key, row] of existing) {
    if (!sourceRows.has(key)) {
      idsToDelete.push(row.id);
    }
  }

  if (options.dryRun) {
    return {
      created: toCreate.length,
      updated: toUpdate.length,
      deleted: options.applyDeletions ? idsToDelete.length : 0,
    };
  }

  for (const batch of chunk(toCreate, GEO_GUARDS.BATCH_SIZE)) {
    await prisma.inseePostal.createMany({ data: batch, skipDuplicates: true });
  }

  for (const batch of chunk(toUpdate, GEO_GUARDS.BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map(({ id, row }) =>
        prisma.inseePostal.update({
          where: { id },
          data: {
            nomCommune: row.nomCommune,
            libelleAcheminement: row.libelleAcheminement,
            ligne5: row.ligne5,
          },
        }),
      ),
    );
  }

  let deleted = 0;
  if (options.applyDeletions) {
    for (const batch of chunk(idsToDelete, GEO_GUARDS.BATCH_SIZE)) {
      const { count } = await prisma.inseePostal.deleteMany({ where: { id: { in: batch } } });
      deleted += count;
    }
  }

  return { created: toCreate.length, updated: toUpdate.length, deleted };
};

/** Nombre de lignes qui disparaîtraient, calculé avant écriture pour armer le garde-fou. */
export const countPendingDeletions = (
  sourceRows: ReadonlyMap<string, InseePostalRow>,
  existing: ReadonlyMap<string, StoredInseePostal>,
): number => {
  let pending = 0;
  for (const key of existing.keys()) {
    if (!sourceRows.has(key)) {
      pending++;
    }
  }
  return pending;
};
