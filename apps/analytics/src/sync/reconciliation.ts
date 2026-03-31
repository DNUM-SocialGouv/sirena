import type { PrismaClient as SourcePrismaClient } from '@sirena/db/generated/prisma';
import type { Logger } from 'pino';
import type { PrismaClient as AnalyticsPrismaClient } from '../../generated/prisma/index.js';
import { recordReconciliation, recordSyncRun } from '../metrics.js';
import { checkDrift } from './alert.js';
import { runIncrementalSync } from './incremental.js';

type TableReconciliation = {
  table: string;
  sourceCount: number;
  analyticsCount: number;
  driftPct: number;
  isDrift: boolean;
  orphansDeleted: number;
  missingResynced: number;
  status: string;
};

export type ReconciliationResult = {
  tables: TableReconciliation[];
  overallStatus: string;
  durationMs: number;
};

type TablePair = {
  name: string;
  countSource: (db: SourcePrismaClient) => Promise<number>;
  countAnalytics: (db: AnalyticsPrismaClient) => Promise<number>;
  getSourceIds: (db: SourcePrismaClient) => Promise<string[]>;
  getAnalyticsSourceIds: (db: AnalyticsPrismaClient) => Promise<string[]>;
  deleteOrphans: (db: AnalyticsPrismaClient, orphanSourceIds: string[]) => Promise<number>;
};

function createTablePair(
  name: string,
  source: {
    count: (db: SourcePrismaClient) => Promise<number>;
    getIds: (db: SourcePrismaClient) => Promise<string[]>;
  },
  analytics: {
    count: (db: AnalyticsPrismaClient) => Promise<number>;
    getSourceIds: (db: AnalyticsPrismaClient) => Promise<string[]>;
    deleteBySourceIds: (db: AnalyticsPrismaClient, ids: string[]) => Promise<number>;
  },
): TablePair {
  return {
    name,
    countSource: source.count,
    countAnalytics: analytics.count,
    getSourceIds: source.getIds,
    getAnalyticsSourceIds: analytics.getSourceIds,
    deleteOrphans: analytics.deleteBySourceIds,
  };
}

const TABLE_PAIRS: TablePair[] = [
  createTablePair(
    'Requete',
    {
      count: (db) => db.requete.count(),
      getIds: async (db) => (await db.requete.findMany({ select: { id: true } })).map((r) => r.id),
    },
    {
      count: (db) => db.factRequete.count(),
      getSourceIds: async (db) =>
        (await db.factRequete.findMany({ select: { sourceId: true } })).map((r) => r.sourceId),
      deleteBySourceIds: async (db, ids) =>
        (await db.factRequete.deleteMany({ where: { sourceId: { in: ids } } })).count,
    },
  ),
  createTablePair(
    'RequeteEtape',
    {
      count: (db) => db.requeteEtape.count(),
      getIds: async (db) => (await db.requeteEtape.findMany({ select: { id: true } })).map((r) => r.id),
    },
    {
      count: (db) => db.factEtape.count(),
      getSourceIds: async (db) => (await db.factEtape.findMany({ select: { sourceId: true } })).map((r) => r.sourceId),
      deleteBySourceIds: async (db, ids) => (await db.factEtape.deleteMany({ where: { sourceId: { in: ids } } })).count,
    },
  ),
  createTablePair(
    'Entite',
    {
      count: (db) => db.entite.count(),
      getIds: async (db) => (await db.entite.findMany({ select: { id: true } })).map((r) => r.id),
    },
    {
      count: (db) => db.dimEntite.count(),
      getSourceIds: async (db) => (await db.dimEntite.findMany({ select: { sourceId: true } })).map((r) => r.sourceId),
      deleteBySourceIds: async (db, ids) => (await db.dimEntite.deleteMany({ where: { sourceId: { in: ids } } })).count,
    },
  ),
];

async function reconcileTable(
  pair: TablePair,
  sourceDb: SourcePrismaClient,
  analyticsDb: AnalyticsPrismaClient,
  log: Logger,
  driftThreshold: number,
): Promise<TableReconciliation> {
  const sourceCount = await pair.countSource(sourceDb);
  const analyticsCount = await pair.countAnalytics(analyticsDb);
  const { isDrift, pct } = checkDrift(sourceCount, analyticsCount, driftThreshold);

  const tableResult: TableReconciliation = {
    table: pair.name,
    sourceCount,
    analyticsCount,
    driftPct: Math.round(pct * 100) / 100,
    isDrift,
    orphansDeleted: 0,
    missingResynced: 0,
    status: 'OK',
  };

  if (sourceCount === analyticsCount) return tableResult;

  if (isDrift) {
    log.warn(
      { table: pair.name, sourceCount, analyticsCount, driftPct: pct },
      'Drift exceeds threshold — skipping auto-fix',
    );
    tableResult.status = 'DRIFT_DETECTED';
    return tableResult;
  }

  log.info(
    { table: pair.name, sourceCount, analyticsCount, driftPct: pct },
    'Count mismatch within threshold — auto-fixing',
  );

  const sourceIds = new Set(await pair.getSourceIds(sourceDb));
  const analyticsSourceIds = await pair.getAnalyticsSourceIds(analyticsDb);

  const orphanIds = analyticsSourceIds.filter((id) => !sourceIds.has(id));
  if (orphanIds.length > 0) {
    tableResult.orphansDeleted = await pair.deleteOrphans(analyticsDb, orphanIds);
    log.info({ table: pair.name, count: tableResult.orphansDeleted }, 'Deleted orphan records');
  }

  const analyticsIdSet = new Set(analyticsSourceIds);
  const missingIds = [...sourceIds].filter((id) => !analyticsIdSet.has(id));
  if (missingIds.length > 0) {
    tableResult.missingResynced = missingIds.length;
    log.info({ table: pair.name, count: missingIds.length }, 'Re-syncing missing records via incremental');
  }

  tableResult.status = 'FIXED';
  return tableResult;
}

export async function runReconciliation(
  sourceDb: SourcePrismaClient,
  analyticsDb: AnalyticsPrismaClient,
  log: Logger,
  driftThreshold: number,
): Promise<ReconciliationResult> {
  const startedAt = new Date();
  const tables: TableReconciliation[] = [];
  let hasDrift = false;
  let hasError = false;

  for (const pair of TABLE_PAIRS) {
    try {
      const tableResult = await reconcileTable(pair, sourceDb, analyticsDb, log, driftThreshold);
      if (tableResult.status === 'DRIFT_DETECTED') hasDrift = true;
      tables.push(tableResult);
    } catch (err) {
      log.error({ err, table: pair.name }, 'Reconciliation failed for table');
      hasError = true;
      tables.push({
        table: pair.name,
        sourceCount: 0,
        analyticsCount: 0,
        driftPct: 0,
        isDrift: false,
        orphansDeleted: 0,
        missingResynced: 0,
        status: 'ERROR',
      });
    }
  }

  for (const t of tables) {
    recordReconciliation(t.table, t.driftPct, t.orphansDeleted, t.missingResynced);
  }

  if (tables.some((t) => t.missingResynced > 0)) {
    log.info('Running full incremental sync to fill missing records');
    await runIncrementalSync(sourceDb, analyticsDb, log);
  }

  const endedAt = new Date();
  const overallStatus = hasError ? 'FAILED' : hasDrift ? 'DRIFT_DETECTED' : 'SUCCESS';
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const result: ReconciliationResult = { tables, overallStatus, durationMs };
  recordSyncRun('RECONCILIATION', overallStatus, durationMs);

  await analyticsDb.syncCursor.upsert({
    where: { tableName: 'RECONCILIATION' },
    create: { id: 'RECONCILIATION', tableName: 'RECONCILIATION', lastSyncAt: startedAt, status: overallStatus },
    update: { lastSyncAt: startedAt, status: overallStatus },
  });

  await analyticsDb.syncLog.create({
    data: {
      syncType: 'RECONCILIATION',
      status: overallStatus,
      details: result as unknown as Record<string, unknown>,
      startedAt,
      endedAt,
    },
  });

  return result;
}
