import { type Prisma, prisma } from '../../libs/prisma.js';
import { GEO_GUARDS } from './geoReferentiel.constant.js';
import { inseePostalKey } from './geoReferentiel.parser.js';
import type {
  CommuneDiff,
  CommuneRow,
  InseePostalDiff,
  InseePostalRow,
  StoredInseePostal,
} from './geoReferentiel.type.js';

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
 * Compare le référentiel des communes à la base.
 *
 * Aucune commune n'est jamais supprimée : la clé étrangère de `InseePostal` l'interdirait,
 * et la source ne retire pas de commune (elle les bascule en `OBSOLETE`). Les communes
 * présentes en base mais absentes de la source sont donc conservées et seulement comptées.
 */
export const diffCommunes = (
  sourceRows: ReadonlyMap<string, CommuneRow>,
  existing: ReadonlyMap<string, CommuneRow>,
): CommuneDiff => {
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

  let orphans = 0;
  for (const comCode of existing.keys()) {
    if (!sourceRows.has(comCode)) {
      orphans++;
    }
  }

  return { toCreate, toUpdate, orphans };
};

/**
 * Compare la correspondance code INSEE / code postal à la base.
 *
 * Les suppressions sont isolées dans `idsToDelete` : l'appelant décide de les appliquer ou
 * non selon leur volume, qu'il lit sur ce même diff plutôt qu'en le recalculant.
 */
export const diffInseePostal = (
  sourceRows: ReadonlyMap<string, InseePostalRow>,
  existing: ReadonlyMap<string, StoredInseePostal>,
): InseePostalDiff => {
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

  return { toCreate, toUpdate, idsToDelete };
};

/**
 * Les mises à jour partent une à une : une transaction interactive n'emprunte qu'une
 * connexion, sur laquelle un lot ne serait de toute façon pas groupé. Le diff mensuel se
 * compte en dizaines de lignes, et la toute première synchronisation n'en contient aucune.
 */
const writeCommunes = async (tx: Prisma.TransactionClient, diff: CommuneDiff) => {
  for (const batch of chunk(diff.toCreate, GEO_GUARDS.BATCH_SIZE)) {
    await tx.commune.createMany({ data: batch, skipDuplicates: true });
  }

  for (const { comCode, ...data } of diff.toUpdate) {
    await tx.commune.update({ where: { comCode }, data });
  }
};

const writeInseePostal = async (
  tx: Prisma.TransactionClient,
  diff: InseePostalDiff,
  options: { applyDeletions: boolean },
) => {
  for (const batch of chunk(diff.toCreate, GEO_GUARDS.BATCH_SIZE)) {
    await tx.inseePostal.createMany({ data: batch, skipDuplicates: true });
  }

  for (const { id, row } of diff.toUpdate) {
    await tx.inseePostal.update({
      where: { id },
      data: {
        nomCommune: row.nomCommune,
        libelleAcheminement: row.libelleAcheminement,
        ligne5: row.ligne5,
      },
    });
  }

  if (!options.applyDeletions) {
    return;
  }

  for (const batch of chunk(diff.idsToDelete, GEO_GUARDS.BATCH_SIZE)) {
    await tx.inseePostal.deleteMany({ where: { id: { in: batch } } });
  }
};

/**
 * Applique les deux diffs dans une transaction unique.
 *
 * Une interruption — délai du job, connexion perdue — ne peut ainsi pas laisser `Commune`
 * rafraîchie face à un `InseePostal` resté sur l'ancien référentiel. Les communes sont
 * écrites d'abord : les codes postaux créés dans la foulée pointent vers elles.
 */
export const applyGeoReferentiel = async (
  communes: CommuneDiff,
  inseePostal: InseePostalDiff,
  options: { applyDeletions: boolean },
): Promise<void> => {
  await prisma.$transaction(
    async (tx) => {
      await writeCommunes(tx, communes);
      await writeInseePostal(tx, inseePostal, options);
    },
    { timeout: GEO_GUARDS.WRITE_TIMEOUT_MS },
  );
};
