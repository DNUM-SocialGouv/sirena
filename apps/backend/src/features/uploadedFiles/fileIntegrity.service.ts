import fs from 'node:fs';
import { abortControllerStorage, getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { deleteFilesFromMinio, listMinioObjects, type MinioObjectInfo } from '../../libs/minio.js';
import { prisma } from '../../libs/prisma.js';

export type FileIntegrityResult = {
  orphanDbFiles: number;
  orphanDbFilesSize: number;
  dbFilesWithoutS3: number;
  dbFilesWithoutS3Size: number;
  s3FilesWithoutDb: number;
  s3FilesWithoutDbSize: number;
};

export type FileIntegrityOptions = {
  removeOrphans?: boolean;
  removeDangling?: boolean;
  /** Page size for scanning `uploadedFile`, and chunk size for `deleteMany` calls. */
  dbBatchSize?: number;
  /** Chunk size for S3 `DeleteObjects` calls. Hard-capped at 1000 (API limit). */
  s3BatchSize?: number;
  /** Optional path to write one NDJSON line per flagged file, for full auditability. */
  reportFilePath?: string;
};

// S3/MinIO's DeleteObjects API accepts at most 1000 keys per request.
const S3_DELETE_API_LIMIT = 1000;
const DEFAULT_DB_BATCH_SIZE = 1000;
const DEFAULT_S3_BATCH_SIZE = 1000;
// Number of example rows logged individually per category, to keep logs readable at scale.
const LOG_SAMPLE_SIZE = 20;

type DbFile = {
  id: string;
  fileName: string;
  filePath: string;
  safeFilePath: string | null;
  size: number;
  status: string;
  createdAt: Date;
  requeteId: string | null;
  faitSituationId: string | null;
  requeteEtapeId: string | null;
  demarchesEngageesId: string | null;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const isOrphan = (f: DbFile): boolean =>
  !f.requeteId && !f.faitSituationId && !f.requeteEtapeId && !f.demarchesEngageesId;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export async function runFileIntegrityCheck(options?: FileIntegrityOptions): Promise<FileIntegrityResult> {
  const logger = getLoggerStore();
  const signal = abortControllerStorage.getStore()?.signal;
  const {
    removeOrphans = false,
    removeDangling = false,
    dbBatchSize = DEFAULT_DB_BATCH_SIZE,
    s3BatchSize = DEFAULT_S3_BATCH_SIZE,
    reportFilePath,
  } = options ?? {};

  if (dbBatchSize <= 0) throw new Error('dbBatchSize must be a positive integer');
  if (s3BatchSize <= 0) throw new Error('s3BatchSize must be a positive integer');

  const effectiveS3BatchSize = Math.min(s3BatchSize, S3_DELETE_API_LIMIT);
  if (s3BatchSize > S3_DELETE_API_LIMIT) {
    logger.warn(`s3BatchSize=${s3BatchSize} exceeds the S3 DeleteObjects API limit, capping to ${S3_DELETE_API_LIMIT}`);
  }

  const throwIfAborted = (phase: string): void => {
    if (signal?.aborted) {
      throw new Error(`File integrity check aborted (timeout) during phase: ${phase}`);
    }
  };

  const reportStream = reportFilePath ? fs.createWriteStream(reportFilePath, { flags: 'w' }) : undefined;
  const writeReport = (category: string, payload: unknown): void => {
    reportStream?.write(`${JSON.stringify({ category, ...(payload as object) })}\n`);
  };

  logger.info(
    { removeOrphans, removeDangling, dbBatchSize, s3BatchSize: effectiveS3BatchSize, reportFilePath },
    'Starting file integrity check',
  );

  // Phase 1: list every S3 object once. Needed up front to classify DB rows as
  // orphan/dangling while scanning them, and to detect S3-only orphans afterwards.
  throwIfAborted('s3-list');
  const s3StartedAt = Date.now();
  const s3Objects = await listMinioObjects();
  const s3Paths = new Set(s3Objects.map((o) => o.name));
  logger.info({ count: s3Objects.length, durationMs: Date.now() - s3StartedAt }, 'Listed objects from S3');

  // Phase 2: page through `uploadedFile` with keyset pagination instead of loading
  // the whole table at once. Orphan/dangling rows are removed page by page (when
  // requested) so we never accumulate more than one page of full records in memory.
  const dbPaths = new Set<string>();
  let totalDbFiles = 0;
  let orphanCount = 0;
  let orphanSize = 0;
  let removedOrphanDbCount = 0;
  const orphanSample: DbFile[] = [];
  let danglingCount = 0;
  let danglingSize = 0;
  let removedDanglingCount = 0;
  const danglingSample: DbFile[] = [];

  const dbStartedAt = Date.now();
  let cursor: string | undefined;
  for (;;) {
    throwIfAborted('db-scan');
    const page = await prisma.uploadedFile.findMany({
      select: {
        id: true,
        fileName: true,
        filePath: true,
        safeFilePath: true,
        size: true,
        status: true,
        createdAt: true,
        requeteId: true,
        faitSituationId: true,
        requeteEtapeId: true,
        demarchesEngageesId: true,
      },
      // Keyset pagination via an explicit `id > cursor` filter, NOT Prisma's
      // `cursor`/`skip` option: that option requires the cursor row to still
      // exist at query time, and rows from the current page get deleted
      // (removeOrphans/removeDangling) before the next page is fetched — which
      // would silently return an empty page and truncate the scan.
      orderBy: { id: 'asc' },
      take: dbBatchSize,
      ...(cursor ? { where: { id: { gt: cursor } } } : {}),
    });
    if (page.length === 0) break;

    totalDbFiles += page.length;
    cursor = page[page.length - 1].id;

    const pageOrphans: DbFile[] = [];
    const pageDangling: DbFile[] = [];

    for (const f of page) {
      dbPaths.add(f.filePath);
      if (f.safeFilePath) dbPaths.add(f.safeFilePath);

      if (isOrphan(f)) {
        orphanCount++;
        orphanSize += f.size;
        if (orphanSample.length < LOG_SAMPLE_SIZE) orphanSample.push(f);
        writeReport('orphan-db', f);
        pageOrphans.push(f);
      }

      if (!s3Paths.has(f.filePath)) {
        danglingCount++;
        danglingSize += f.size;
        if (danglingSample.length < LOG_SAMPLE_SIZE) danglingSample.push(f);
        writeReport('dangling-db', f);
        pageDangling.push(f);
      }
    }

    if (removeOrphans && pageOrphans.length > 0) {
      removedOrphanDbCount += await removeOrphanDbFiles(pageOrphans, {
        s3Paths,
        s3BatchSize: effectiveS3BatchSize,
        dbBatchSize,
        logger,
        throwIfAborted,
      });
    }

    if (removeDangling && pageDangling.length > 0) {
      removedDanglingCount += await removeDbRowsByIds(
        pageDangling.map((f) => f.id),
        dbBatchSize,
        logger,
        throwIfAborted,
        'dangling',
      );
    }

    logger.info({ scanned: totalDbFiles }, 'DB scan progress');
    if (page.length < dbBatchSize) break;
  }
  logger.info(
    { count: totalDbFiles, durationMs: Date.now() - dbStartedAt },
    'Finished scanning uploaded files from database',
  );

  // Phase 3: S3 objects with no matching DB row. Requires the full `dbPaths` set,
  // so it can only run after the DB scan above has completed.
  const s3FilesWithoutDb = s3Objects.filter((o) => !dbPaths.has(o.name));
  const s3FilesWithoutDbSize = s3FilesWithoutDb.reduce((s, o) => s + o.size, 0);
  for (const o of s3FilesWithoutDb) writeReport('orphan-s3', o);

  let removedOrphanS3Count = 0;
  if (removeOrphans && s3FilesWithoutDb.length > 0) {
    removedOrphanS3Count = await removeS3OnlyOrphans(s3FilesWithoutDb, effectiveS3BatchSize, logger, throwIfAborted);
  }

  if (reportStream) {
    await new Promise<void>((resolve, reject) => {
      reportStream.end((err: Error | null | undefined) => (err ? reject(err) : resolve()));
    });
  }

  logger.info(`Orphan DB files (unlinked to any entity): ${orphanCount} (${formatBytes(orphanSize)})`);
  for (const [i, f] of orphanSample.entries()) {
    logger.warn(
      `orphan-db | ${i + 1}/${orphanCount} | ${f.id} | ${f.fileName} | ${f.filePath} | ${f.status} | ${formatBytes(f.size)} | ${f.createdAt.toISOString()}`,
    );
  }
  if (removeOrphans) logger.info(`Removed ${removedOrphanDbCount}/${orphanCount} orphan DB files`);

  logger.info(`DB files missing from S3 (broken refs): ${danglingCount} (${formatBytes(danglingSize)})`);
  for (const [i, f] of danglingSample.entries()) {
    logger.warn(
      `dangling-db | ${i + 1}/${danglingCount} | ${f.id} | ${f.fileName} | ${f.filePath} | ${formatBytes(f.size)}`,
    );
  }
  if (removeDangling) logger.info(`Removed ${removedDanglingCount}/${danglingCount} dangling DB records`);

  logger.info(`S3 files without DB entry: ${s3FilesWithoutDb.length} (${formatBytes(s3FilesWithoutDbSize)})`);
  for (const [i, o] of s3FilesWithoutDb.slice(0, LOG_SAMPLE_SIZE).entries()) {
    logger.warn(
      `orphan-s3 | ${i + 1}/${s3FilesWithoutDb.length} | ${o.name} | ${formatBytes(o.size)} | ${o.lastModified.toISOString()}`,
    );
  }
  if (removeOrphans) logger.info(`Removed ${removedOrphanS3Count}/${s3FilesWithoutDb.length} orphan S3 files`);

  const result: FileIntegrityResult = {
    orphanDbFiles: orphanCount,
    orphanDbFilesSize: orphanSize,
    dbFilesWithoutS3: danglingCount,
    dbFilesWithoutS3Size: danglingSize,
    s3FilesWithoutDb: s3FilesWithoutDb.length,
    s3FilesWithoutDbSize: s3FilesWithoutDbSize,
  };

  logger.info(result, 'File integrity check completed');

  return result;
}

/**
 * Removes one page of orphan DB rows: their S3 object(s) are deleted in batches
 * first, and only rows whose S3 objects were all successfully removed (or never
 * existed) are then deleted from the DB in batches. Rows with a failed S3
 * deletion keep their DB record so the next run retries them.
 */
async function removeOrphanDbFiles(
  orphans: DbFile[],
  ctx: {
    s3Paths: Set<string>;
    s3BatchSize: number;
    dbBatchSize: number;
    logger: ReturnType<typeof getLoggerStore>;
    throwIfAborted: (phase: string) => void;
  },
): Promise<number> {
  const { s3Paths, s3BatchSize, dbBatchSize, logger, throwIfAborted } = ctx;

  const keysToDelete: string[] = [];
  for (const f of orphans) {
    if (s3Paths.has(f.filePath)) keysToDelete.push(f.filePath);
    if (f.safeFilePath && s3Paths.has(f.safeFilePath)) keysToDelete.push(f.safeFilePath);
  }

  const failedKeys = new Set<string>();
  for (const batch of chunk(keysToDelete, s3BatchSize)) {
    throwIfAborted('remove-orphans-s3');
    try {
      const errors = await deleteFilesFromMinio(batch);
      for (const e of errors) failedKeys.add(e.key);
      if (errors.length > 0) {
        logger.error({ count: errors.length, sample: errors.slice(0, 5) }, 'Some orphan S3 deletions failed');
      }
    } catch (err) {
      logger.error({ err, count: batch.length }, 'Failed to delete S3 batch for orphan files');
      for (const k of batch) failedKeys.add(k);
    }
  }

  const removableIds = orphans
    .filter((f) => {
      const filePathOk = !s3Paths.has(f.filePath) || !failedKeys.has(f.filePath);
      const safePathOk = !f.safeFilePath || !s3Paths.has(f.safeFilePath) || !failedKeys.has(f.safeFilePath);
      return filePathOk && safePathOk;
    })
    .map((f) => f.id);

  return removeDbRowsByIds(removableIds, dbBatchSize, logger, throwIfAborted, 'orphan');
}

async function removeDbRowsByIds(
  ids: string[],
  batchSize: number,
  logger: ReturnType<typeof getLoggerStore>,
  throwIfAborted: (phase: string) => void,
  label: string,
): Promise<number> {
  let removed = 0;
  for (const batch of chunk(ids, batchSize)) {
    throwIfAborted(`remove-${label}-db`);
    try {
      const res = await prisma.uploadedFile.deleteMany({ where: { id: { in: batch } } });
      removed += res.count;
    } catch (err) {
      logger.error({ err, count: batch.length }, `Failed to delete DB batch of ${label} records`);
    }
  }
  return removed;
}

async function removeS3OnlyOrphans(
  s3Files: MinioObjectInfo[],
  s3BatchSize: number,
  logger: ReturnType<typeof getLoggerStore>,
  throwIfAborted: (phase: string) => void,
): Promise<number> {
  let removed = 0;
  for (const batch of chunk(s3Files, s3BatchSize)) {
    throwIfAborted('remove-orphans-s3-only');
    const keys = batch.map((o) => o.name);
    try {
      const errors = await deleteFilesFromMinio(keys);
      removed += keys.length - errors.length;
      if (errors.length > 0) {
        logger.error({ count: errors.length, sample: errors.slice(0, 5) }, 'Some S3-only orphan deletions failed');
      }
    } catch (err) {
      logger.error({ err, count: keys.length }, 'Failed to delete S3 batch of orphan objects');
    }
  }
  return removed;
}
