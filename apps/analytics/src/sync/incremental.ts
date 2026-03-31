import type { PrismaClient as SourcePrismaClient } from '@sirena/db/generated/prisma';
import type { Logger } from 'pino';
import type { PrismaClient as AnalyticsPrismaClient } from '../../generated/prisma/index.js';
import { anonymizeEntite } from '../anonymize/entite.js';
import { anonymizeEtape } from '../anonymize/etape.js';
import { anonymizeRequete } from '../anonymize/requete.js';
import { recordRecordsProcessed, recordSyncError, recordSyncRun } from '../metrics.js';
import { ensureDimTemps } from './dim-temps.js';

const BATCH_SIZE = 100;

export type SyncResult = {
  syncedRequetes: number;
  syncedEtapes: number;
  syncedEntites: number;
  syncedCommunes: number;
  syncedEnums: number;
  errors: string[];
  durationMs: number;
};

type AnalyticsTransaction = Parameters<Parameters<AnalyticsPrismaClient['$transaction']>[0]>[0];

async function getOrCreateCursor(db: AnalyticsPrismaClient, tableName: string) {
  return db.syncCursor.upsert({
    where: { tableName },
    create: { id: tableName, tableName, lastSyncAt: new Date('1970-01-01T00:00:00Z') },
    update: {},
  });
}

async function collectChangedIds(
  sourceDb: SourcePrismaClient,
  cursor: { lastSyncAt: Date; lastChangeLogId: string | null },
  entityName: string,
): Promise<{ ids: string[]; maxChangeLogId: string | null }> {
  const changeLogs = await sourceDb.changeLog.findMany({
    where: {
      entity: entityName,
      ...(cursor.lastChangeLogId ? { id: { gt: cursor.lastChangeLogId } } : { changedAt: { gt: cursor.lastSyncAt } }),
    },
    orderBy: { id: 'asc' },
    select: { id: true, entityId: true },
  });

  const ids = [...new Set(changeLogs.map((cl) => cl.entityId))];
  const maxChangeLogId = changeLogs.at(-1)?.id ?? cursor.lastChangeLogId;
  return { ids, maxChangeLogId };
}

type EnumSyncConfig = {
  fetchSource: (db: SourcePrismaClient) => Promise<Array<{ id: string; label: string }>>;
  upsertDim: (db: AnalyticsPrismaClient, item: { id: string; label: string }) => Promise<unknown>;
};

const ENUM_SYNCS: EnumSyncConfig[] = [
  {
    fetchSource: (db) => db.motifEnum.findMany(),
    upsertDim: (db, item) =>
      db.dimMotif.upsert({
        where: { sourceId: item.id },
        create: { sourceId: item.id, label: item.label },
        update: { label: item.label },
      }),
  },
  {
    fetchSource: (db) => db.consequenceEnum.findMany(),
    upsertDim: (db, item) =>
      db.dimConsequence.upsert({
        where: { sourceId: item.id },
        create: { sourceId: item.id, label: item.label },
        update: { label: item.label },
      }),
  },
  {
    fetchSource: (db) => db.maltraitanceTypeEnum.findMany(),
    upsertDim: (db, item) =>
      db.dimMaltraitanceType.upsert({
        where: { sourceId: item.id },
        create: { sourceId: item.id, label: item.label },
        update: { label: item.label },
      }),
  },
  {
    fetchSource: (db) => db.misEnCauseTypeEnum.findMany(),
    upsertDim: (db, item) =>
      db.dimMisEnCauseType.upsert({
        where: { sourceId: item.id },
        create: { sourceId: item.id, label: item.label },
        update: { label: item.label },
      }),
  },
  {
    fetchSource: (db) => db.lieuTypeEnum.findMany(),
    upsertDim: (db, item) =>
      db.dimLieuType.upsert({
        where: { sourceId: item.id },
        create: { sourceId: item.id, label: item.label },
        update: { label: item.label },
      }),
  },
];

async function syncEnumDimensions(sourceDb: SourcePrismaClient, analyticsDb: AnalyticsPrismaClient): Promise<number> {
  let count = 0;
  for (const { fetchSource, upsertDim } of ENUM_SYNCS) {
    const items = await fetchSource(sourceDb);
    for (const item of items) {
      await upsertDim(analyticsDb, item);
      count++;
    }
  }
  return count;
}

async function processBatches<T>(
  ids: string[],
  fetchBatch: (batchIds: string[]) => Promise<T[]>,
  processItem: (item: T) => Promise<void>,
  logger: Logger,
  label: string,
): Promise<number> {
  let count = 0;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const items = await fetchBatch(batch);
    for (const item of items) {
      await processItem(item);
      count++;
    }
    logger.debug({ batch: Math.floor(i / BATCH_SIZE) + 1, count }, `Synced ${label} batch`);
  }
  return count;
}

async function syncEntites(
  sourceDb: SourcePrismaClient,
  analyticsDb: AnalyticsPrismaClient,
  ids: string[],
  logger: Logger,
): Promise<number> {
  return processBatches(
    ids,
    (batch) =>
      sourceDb.entite.findMany({ where: { id: { in: batch } }, include: { entiteType: true, entiteMere: true } }),
    async (entite) => {
      const data = anonymizeEntite(entite);
      await analyticsDb.dimEntite.upsert({ where: { sourceId: data.sourceId }, create: data, update: data });
    },
    logger,
    'entites',
  );
}

async function syncCommunes(
  sourceDb: SourcePrismaClient,
  analyticsDb: AnalyticsPrismaClient,
  ids: string[],
  logger: Logger,
): Promise<number> {
  return processBatches(
    ids,
    (batch) => sourceDb.commune.findMany({ where: { comCode: { in: batch } } }),
    async (commune) => {
      const data = {
        comLib: commune.comLib,
        dptCodeActuel: commune.dptCodeActuel,
        dptLibActuel: commune.dptLibActuel,
        regCodeActuel: commune.regCodeActuel,
        regLibActuel: commune.regLibActuel,
      };
      await analyticsDb.dimCommune.upsert({
        where: { sourceId: commune.comCode },
        create: { sourceId: commune.comCode, ...data },
        update: data,
      });
    },
    logger,
    'communes',
  );
}

async function syncRequetes(
  sourceDb: SourcePrismaClient,
  analyticsDb: AnalyticsPrismaClient,
  ids: string[],
  logger: Logger,
): Promise<number> {
  return processBatches(
    ids,
    (batch) =>
      sourceDb.requete.findMany({
        where: { id: { in: batch } },
        include: {
          receptionType: true,
          provenance: true,
          declarant: {
            include: {
              age: true,
              identite: { include: { civilite: true } },
              lienVictime: true,
              adresse: true,
            },
          },
          etapes: {
            include: { statut: true, clotureReason: true },
            orderBy: { createdAt: 'asc' },
          },
          requeteEntites: {
            include: { statut: true, priorite: true },
          },
          situations: {
            include: {
              lieuDeSurvenue: { include: { adresse: true } },
              misEnCause: true,
              faits: {
                include: { motifs: true, consequences: true, maltraitanceTypes: true },
              },
            },
          },
        },
      }),
    async (requete) => {
      try {
        const anonymized = anonymizeRequete(requete);
        await analyticsDb.$transaction(async (tx) => {
          const creationTempsId = await ensureDimTemps(tx, anonymized.creationDate);
          const receptionTempsId = anonymized.receptionDate ? await ensureDimTemps(tx, anonymized.receptionDate) : null;

          const entiteDim = anonymized.entiteId
            ? await tx.dimEntite.findUnique({ where: { sourceId: anonymized.entiteId } })
            : null;
          const entiteId = entiteDim?.id ?? null;
          const communeId = anonymized.communeCodePostal
            ? await resolveCommuneId(sourceDb, tx, anonymized.communeCodePostal)
            : null;
          const misEnCauseTypeDim = anonymized.misEnCauseTypeId
            ? await tx.dimMisEnCauseType.findUnique({ where: { sourceId: anonymized.misEnCauseTypeId } })
            : null;
          const misEnCauseTypeId = misEnCauseTypeDim?.id ?? null;
          const lieuTypeDim = anonymized.lieuTypeId
            ? await tx.dimLieuType.findUnique({ where: { sourceId: anonymized.lieuTypeId } })
            : null;
          const lieuTypeId = lieuTypeDim?.id ?? null;

          const factData = {
            statut: anonymized.statut,
            priorite: anonymized.priorite,
            receptionType: anonymized.receptionType,
            provenance: anonymized.provenance,
            declarantAge: anonymized.declarantAge,
            declarantCivilite: anonymized.declarantCivilite,
            declarantEstVictime: anonymized.declarantEstVictime,
            declarantLienVictime: anonymized.declarantLienVictime,
            declarantDepartement: anonymized.declarantDepartement,
            declarantEstHandicapee: anonymized.declarantEstHandicapee,
            nombreFaits: anonymized.nombreFaits,
            nombreConsequences: anonymized.nombreConsequences,
            nombreEtapes: anonymized.nombreEtapes,
            estCloturee: anonymized.estCloturee,
            raisonCloture: anonymized.raisonCloture,
            sourceUpdatedAt: anonymized.sourceUpdatedAt,
            creationTempsId,
            receptionTempsId,
            entiteId,
            communeId,
            misEnCauseTypeId,
            lieuTypeId,
          };

          const factRequete = await tx.factRequete.upsert({
            where: { sourceId: anonymized.sourceId },
            create: { sourceId: anonymized.sourceId, sourceCreatedAt: anonymized.sourceCreatedAt, ...factData },
            update: factData,
          });

          await tx.factFaitMotif.deleteMany({ where: { requeteSourceId: anonymized.sourceId } });
          await tx.factFaitConsequence.deleteMany({ where: { requeteSourceId: anonymized.sourceId } });
          await tx.factFaitMaltraitanceType.deleteMany({ where: { requeteSourceId: anonymized.sourceId } });

          if (!anonymized.situationId) return;

          const bridgeBase = {
            situationId: anonymized.situationId,
            requeteSourceId: anonymized.sourceId,
            factRequeteId: factRequete.id,
          };

          for (const motifId of anonymized.motifIds) {
            const dim = await tx.dimMotif.findUnique({ where: { sourceId: motifId } });
            if (dim) await tx.factFaitMotif.create({ data: { ...bridgeBase, dimMotifId: dim.id } });
          }
          for (const consequenceId of anonymized.consequenceIds) {
            const dim = await tx.dimConsequence.findUnique({ where: { sourceId: consequenceId } });
            if (dim) await tx.factFaitConsequence.create({ data: { ...bridgeBase, dimConsequenceId: dim.id } });
          }
          for (const maltraitanceTypeId of anonymized.maltraitanceTypeIds) {
            const dim = await tx.dimMaltraitanceType.findUnique({ where: { sourceId: maltraitanceTypeId } });
            if (dim)
              await tx.factFaitMaltraitanceType.create({ data: { ...bridgeBase, dimMaltraitanceTypeId: dim.id } });
          }
        });
      } catch (err) {
        logger.error({ requeteId: requete.id, err }, 'Failed to sync requete');
      }
    },
    logger,
    'requetes',
  );
}

async function resolveCommuneId(
  sourceDb: SourcePrismaClient,
  tx: AnalyticsTransaction,
  codePostal: string,
): Promise<string | null> {
  const inseePostal = await sourceDb.inseePostal.findFirst({ where: { codePostal } });
  if (!inseePostal) return null;
  const dim = await tx.dimCommune.findUnique({ where: { sourceId: inseePostal.codeInsee } });
  return dim?.id ?? null;
}

async function syncEtapes(
  sourceDb: SourcePrismaClient,
  analyticsDb: AnalyticsPrismaClient,
  ids: string[],
  logger: Logger,
): Promise<number> {
  return processBatches(
    ids,
    (batch) =>
      sourceDb.requeteEtape.findMany({
        where: { id: { in: batch } },
        include: { statut: true, notes: { select: { id: true } } },
      }),
    async (etape) => {
      try {
        const anonymized = anonymizeEtape(etape);
        const tempsId = await ensureDimTemps(analyticsDb, anonymized.sourceCreatedAt);
        const factRequeteDim = anonymized.requeteSourceId
          ? await analyticsDb.factRequete.findUnique({ where: { sourceId: anonymized.requeteSourceId } })
          : null;
        const factRequeteId = factRequeteDim?.id ?? null;
        const entiteDim = anonymized.entiteSourceId
          ? await analyticsDb.dimEntite.findUnique({ where: { sourceId: anonymized.entiteSourceId } })
          : null;
        const entiteId = entiteDim?.id ?? null;

        const data = {
          nom: anonymized.nom,
          statut: anonymized.statut,
          estPartagee: anonymized.estPartagee,
          nombreNotes: anonymized.nombreNotes,
          sourceUpdatedAt: anonymized.sourceUpdatedAt,
          factRequeteId,
          entiteId,
          tempsId,
        };

        await analyticsDb.factEtape.upsert({
          where: { sourceId: anonymized.sourceId },
          create: {
            sourceId: anonymized.sourceId,
            requeteSourceId: anonymized.requeteSourceId,
            sourceCreatedAt: anonymized.sourceCreatedAt,
            ...data,
          },
          update: data,
        });
      } catch (err) {
        logger.error({ etapeId: etape.id, err }, 'Failed to sync etape');
      }
    },
    logger,
    'etapes',
  );
}

type EntitySyncConfig = {
  name: string;
  fetchUpdatedIds: (db: SourcePrismaClient, since: Date) => Promise<string[]>;
  sync: (
    sourceDb: SourcePrismaClient,
    analyticsDb: AnalyticsPrismaClient,
    ids: string[],
    logger: Logger,
  ) => Promise<number>;
  resultKey: keyof Omit<SyncResult, 'errors' | 'durationMs' | 'syncedEnums'>;
};

const ENTITY_SYNCS: EntitySyncConfig[] = [
  {
    name: 'Requete',
    fetchUpdatedIds: async (db, since) => {
      const records = await db.requete.findMany({ where: { updatedAt: { gt: since } }, select: { id: true } });
      return records.map((r) => r.id);
    },
    sync: syncRequetes,
    resultKey: 'syncedRequetes',
  },
  {
    name: 'RequeteEtape',
    fetchUpdatedIds: async (db, since) => {
      const records = await db.requeteEtape.findMany({ where: { updatedAt: { gt: since } }, select: { id: true } });
      return records.map((r) => r.id);
    },
    sync: syncEtapes,
    resultKey: 'syncedEtapes',
  },
  {
    name: 'Entite',
    fetchUpdatedIds: async (db, since) => {
      const records = await db.entite.findMany({ where: { updatedAt: { gt: since } }, select: { id: true } });
      return records.map((r) => r.id);
    },
    sync: syncEntites,
    resultKey: 'syncedEntites',
  },
  {
    name: 'Commune',
    fetchUpdatedIds: async (db, since) => {
      const records = await db.commune.findMany({ where: { updatedAt: { gt: since } }, select: { comCode: true } });
      return records.map((r) => r.comCode);
    },
    sync: syncCommunes,
    resultKey: 'syncedCommunes',
  },
];

export async function runIncrementalSync(
  sourceDb: SourcePrismaClient,
  analyticsDb: AnalyticsPrismaClient,
  log: Logger,
): Promise<SyncResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const result: SyncResult = {
    syncedRequetes: 0,
    syncedEtapes: 0,
    syncedEntites: 0,
    syncedCommunes: 0,
    syncedEnums: 0,
    errors,
    durationMs: 0,
  };

  try {
    result.syncedEnums = await syncEnumDimensions(sourceDb, analyticsDb);
    recordRecordsProcessed('Enum', result.syncedEnums);
    log.info({ count: result.syncedEnums }, 'Synced enum dimensions');
  } catch (err) {
    const msg = `Failed to sync enum dimensions: ${err}`;
    log.error({ err }, msg);
    errors.push(msg);
    recordSyncError('Enum');
  }

  for (const entitySync of ENTITY_SYNCS) {
    try {
      const cursor = await getOrCreateCursor(analyticsDb, entitySync.name);
      const updatedIds = await entitySync.fetchUpdatedIds(sourceDb, cursor.lastSyncAt);
      const { ids: changeLogIds, maxChangeLogId } = await collectChangedIds(sourceDb, cursor, entitySync.name);
      const allIds = [...new Set([...updatedIds, ...changeLogIds])];

      if (allIds.length === 0) {
        log.debug({ entity: entitySync.name }, 'No changes detected');
        continue;
      }

      log.info({ entity: entitySync.name, count: allIds.length }, 'Processing changed records');
      result[entitySync.resultKey] = await entitySync.sync(sourceDb, analyticsDb, allIds, log);
      recordRecordsProcessed(entitySync.name, result[entitySync.resultKey]);

      await analyticsDb.syncCursor.update({
        where: { tableName: entitySync.name },
        data: { lastSyncAt: startedAt, lastChangeLogId: maxChangeLogId, status: 'OK' },
      });
    } catch (err) {
      const msg = `Failed to sync ${entitySync.name}: ${err}`;
      log.error({ err, entity: entitySync.name }, msg);
      errors.push(msg);
      recordSyncError(entitySync.name);

      await analyticsDb.syncCursor
        .update({ where: { tableName: entitySync.name }, data: { status: 'ERROR' } })
        .catch(() => {});
    }
  }

  const endedAt = new Date();
  result.durationMs = endedAt.getTime() - startedAt.getTime();

  const status = errors.length > 0 ? 'PARTIAL' : 'SUCCESS';
  recordSyncRun('INCREMENTAL', status, result.durationMs);

  await analyticsDb.syncLog.create({
    data: {
      syncType: 'INCREMENTAL',
      status,
      details: result as unknown as Record<string, unknown>,
      startedAt,
      endedAt,
    },
  });

  return result;
}
