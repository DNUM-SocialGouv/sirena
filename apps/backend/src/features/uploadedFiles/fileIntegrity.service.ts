import fs from 'node:fs';
import { abortControllerStorage, getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { deleteFilesFromMinio, listMinioObjects, statMinioObject } from '../../libs/minio.js';
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
  /**
   * Unlinked rows are only treated as orphans once both their `createdAt` and
   * `updatedAt` are older than this many hours (default 24). Uploads are
   * created unlinked and only attached on form submission, so a recent
   * unlinked row is most likely an in-flight upload. `updatedAt` is checked
   * too because the SIREC migration backdates `createdAt`. 0 disables it.
   */
  orphanMinAgeHours?: number;
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
const DEFAULT_ORPHAN_MIN_AGE_HOURS = 24;
// Number of example rows logged individually per category, to keep logs readable at scale.
const LOG_SAMPLE_SIZE = 20;
// Max concurrent `statObject` calls when re-checking dangling candidates.
const DANGLING_RECHECK_CONCURRENCY = 10;

type DbFile = {
  id: string;
  fileName: string;
  filePath: string;
  safeFilePath: string | null;
  size: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requeteId: string | null;
  faitSituationId: string | null;
  requeteEtapeId: string | null;
  demarchesEngageesId: string | null;
  requeteMessageId: string | null;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const isOrphan = (f: DbFile): boolean =>
  !f.requeteId && !f.faitSituationId && !f.requeteEtapeId && !f.demarchesEngageesId && !f.requeteMessageId;

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
    orphanMinAgeHours = DEFAULT_ORPHAN_MIN_AGE_HOURS,
    reportFilePath,
  } = options ?? {};

  if (dbBatchSize <= 0) throw new Error('dbBatchSize must be a positive integer');
  if (s3BatchSize <= 0) throw new Error('s3BatchSize must be a positive integer');
  if (!(orphanMinAgeHours >= 0)) throw new Error('orphanMinAgeHours must be a non-negative number');

  // Fixed at the start of the run, so rows touched during the scan always fall
  // on the "too recent" side of it.
  const orphanCutoff = new Date(Date.now() - orphanMinAgeHours * 60 * 60 * 1000);
  const isOldEnough = (f: DbFile): boolean =>
    orphanMinAgeHours === 0 || (f.createdAt < orphanCutoff && f.updatedAt < orphanCutoff);

  const effectiveS3BatchSize = Math.min(s3BatchSize, S3_DELETE_API_LIMIT);
  if (s3BatchSize > S3_DELETE_API_LIMIT) {
    logger.warn(`s3BatchSize=${s3BatchSize} exceeds the S3 DeleteObjects API limit, capping to ${S3_DELETE_API_LIMIT}`);
  }

  const throwIfAborted = (phase: string): void => {
    if (signal?.aborted) {
      throw new Error(`File integrity check aborted (timeout) during phase: ${phase}`);
    }
  };

  // Report lines are buffered in memory and flushed with an awaited write
  // before each round of deletions: a write failure rejects (instead of an
  // unhandled stream 'error' event) and aborts the run before any untraced
  // deletion, and the buffer never grows past one page/batch of lines.
  // Opened up front so a bad path fails before anything is deleted.
  const reportHandle = reportFilePath ? await fs.promises.open(reportFilePath, 'w') : undefined;
  const reportLines: string[] = [];
  const writeReport = (category: string, payload: unknown): void => {
    if (reportHandle) reportLines.push(`${JSON.stringify({ category, ...(payload as object) })}\n`);
  };
  const flushReport = async (): Promise<void> => {
    if (!reportHandle || reportLines.length === 0) return;
    await reportHandle.write(reportLines.join(''));
    reportLines.length = 0;
  };

  logger.info(
    {
      removeOrphans,
      removeDangling,
      dbBatchSize,
      s3BatchSize: effectiveS3BatchSize,
      orphanMinAgeHours,
      orphanCutoff,
      reportFilePath,
    },
    'Starting file integrity check',
  );

  const dbPaths = new Set<string>();
  let totalDbFiles = 0;
  let orphanCount = 0;
  let orphanSize = 0;
  let removedOrphanDbCount = 0;
  const orphanSample: DbFile[] = [];
  let recentUnlinkedCount = 0;
  let danglingCount = 0;
  let danglingSize = 0;
  let removedDanglingCount = 0;
  // Dangling rows that are also orphans: reported in both categories, but only
  // deleted once, by the orphan pass, when removeOrphans is set.
  let danglingAlsoOrphanCount = 0;
  const danglingSample: DbFile[] = [];
  let s3OrphanCount = 0;
  let s3OrphanSize = 0;
  const s3OrphanSample: { name: string; size: number }[] = [];
  let removedOrphanS3Count = 0;

  try {
    // Phase 1: list every S3 object once, as a `name -> size` map. Needed up
    // front to classify DB rows as orphan/dangling while scanning them, and to
    // detect S3-only orphans afterwards. Deliberately not an array of
    // {name, size, lastModified} objects: at hundreds of thousands of objects,
    // the per-entry Date is the single biggest avoidable memory cost, and
    // nothing here needs it (see removeOrphanDbFiles / the orphan-s3 log below).
    throwIfAborted('s3-list');
    const s3StartedAt = Date.now();
    const s3Sizes = await listMinioObjects();
    logger.info({ count: s3Sizes.size, durationMs: Date.now() - s3StartedAt }, 'Listed objects from S3');

    // Phase 2: page through `uploadedFile` with keyset pagination instead of loading
    // the whole table at once. Orphan/dangling rows are removed page by page (when
    // requested) so we never accumulate more than one page of full records in memory.

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
          updatedAt: true,
          requeteId: true,
          faitSituationId: true,
          requeteEtapeId: true,
          demarchesEngageesId: true,
          requeteMessageId: true,
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
      const pageDanglingCandidates: DbFile[] = [];

      for (const f of page) {
        dbPaths.add(f.filePath);
        if (f.safeFilePath) dbPaths.add(f.safeFilePath);

        if (isOrphan(f) && !isOldEnough(f)) {
          recentUnlinkedCount++;
        } else if (isOrphan(f)) {
          orphanCount++;
          orphanSize += f.size;
          if (orphanSample.length < LOG_SAMPLE_SIZE) orphanSample.push(f);
          writeReport('orphan-db', f);
          pageOrphans.push(f);
        }

        if (!s3Sizes.has(f.filePath)) pageDanglingCandidates.push(f);
      }

      // `s3Sizes` is a snapshot taken before the scan started, while uploads
      // write the S3 object *before* creating the DB row: a file uploaded during
      // the scan has a row but no entry in the snapshot. Re-check each candidate
      // against S3 so such rows are never reported (nor deleted) as dangling.
      throwIfAborted('dangling-recheck');
      const pageDangling = await confirmDangling(pageDanglingCandidates, logger);
      const pageOrphanIds = new Set(pageOrphans.map((f) => f.id));
      for (const f of pageDangling) {
        if (pageOrphanIds.has(f.id)) danglingAlsoOrphanCount++;
        danglingCount++;
        danglingSize += f.size;
        if (danglingSample.length < LOG_SAMPLE_SIZE) danglingSample.push(f);
        writeReport('dangling-db', f);
      }
      await flushReport();

      if (removeOrphans && pageOrphans.length > 0) {
        removedOrphanDbCount += await removeOrphanDbFiles(pageOrphans, {
          s3Sizes,
          s3BatchSize: effectiveS3BatchSize,
          dbBatchSize,
          logger,
          throwIfAborted,
        });
      }

      // Rows that are also orphans were just handled by the orphan pass above;
      // deleting them again would only yield `count: 0` and skew the totals.
      const danglingToDelete = removeOrphans ? pageDangling.filter((f) => !pageOrphanIds.has(f.id)) : pageDangling;
      if (removeDangling && danglingToDelete.length > 0) {
        removedDanglingCount += await removeDbRowsByIds(
          danglingToDelete.map((f) => f.id),
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
    const s3OrphanCandidates: string[] = [];
    for (const name of s3Sizes.keys()) {
      if (!dbPaths.has(name)) s3OrphanCandidates.push(name);
    }

    // `dbPaths` is not a consistent snapshot: the keyset scan runs on random
    // UUIDs, so a row inserted during the scan behind the cursor is never
    // visited, and a `safeFilePath` written on an already-scanned row is missed.
    // Re-check each candidate against the DB before treating it as an orphan.
    throwIfAborted('orphan-s3-recheck');
    const s3OrphanKeys = await confirmS3Orphans(s3OrphanCandidates, dbBatchSize, logger, throwIfAborted);

    for (const name of s3OrphanKeys) {
      const size = s3Sizes.get(name) ?? 0;
      s3OrphanCount++;
      s3OrphanSize += size;
      if (s3OrphanSample.length < LOG_SAMPLE_SIZE) s3OrphanSample.push({ name, size });
      writeReport('orphan-s3', { name, size });
      if (reportLines.length >= dbBatchSize) await flushReport();
    }
    await flushReport();

    if (removeOrphans && s3OrphanKeys.length > 0) {
      removedOrphanS3Count = await removeS3OnlyOrphans(s3OrphanKeys, effectiveS3BatchSize, logger, throwIfAborted);
    }
  } finally {
    // Also on abort/throw: persist what was classified so far, then release
    // the file. A flush failure here must not mask the original error.
    await flushReport().catch((err) => logger.error({ err }, 'Failed to flush file integrity report'));
    await reportHandle?.close();
  }

  logger.info(`Orphan DB files (unlinked to any entity): ${orphanCount} (${formatBytes(orphanSize)})`);
  for (const [i, f] of orphanSample.entries()) {
    logger.warn(
      `orphan-db | ${i + 1}/${orphanCount} | ${f.id} | ${f.fileName} | ${f.filePath} | ${f.status} | ${formatBytes(f.size)} | ${f.createdAt.toISOString()}`,
    );
  }
  if (removeOrphans) logger.info(`Removed ${removedOrphanDbCount}/${orphanCount} orphan DB files`);
  if (recentUnlinkedCount > 0) {
    logger.info(
      `Skipped ${recentUnlinkedCount} unlinked DB files touched within the last ${orphanMinAgeHours}h (likely in-flight uploads)`,
    );
  }

  logger.info(`DB files missing from S3 (broken refs): ${danglingCount} (${formatBytes(danglingSize)})`);
  for (const [i, f] of danglingSample.entries()) {
    logger.warn(
      `dangling-db | ${i + 1}/${danglingCount} | ${f.id} | ${f.fileName} | ${f.filePath} | ${formatBytes(f.size)}`,
    );
  }
  if (danglingAlsoOrphanCount > 0) {
    logger.info(`${danglingAlsoOrphanCount} of them are also orphan DB files (reported in both categories)`);
  }
  if (removeDangling) {
    const handledByOrphanPass = removeOrphans ? danglingAlsoOrphanCount : 0;
    logger.info(
      `Removed ${removedDanglingCount}/${danglingCount - handledByOrphanPass} dangling DB records` +
        (handledByOrphanPass > 0 ? ` (${handledByOrphanPass} more handled by the orphan pass)` : ''),
    );
  }

  logger.info(`S3 files without DB entry: ${s3OrphanCount} (${formatBytes(s3OrphanSize)})`);
  for (const [i, o] of s3OrphanSample.entries()) {
    logger.warn(`orphan-s3 | ${i + 1}/${s3OrphanCount} | ${o.name} | ${formatBytes(o.size)}`);
  }
  if (removeOrphans) logger.info(`Removed ${removedOrphanS3Count}/${s3OrphanCount} orphan S3 files`);

  const result: FileIntegrityResult = {
    orphanDbFiles: orphanCount,
    orphanDbFilesSize: orphanSize,
    dbFilesWithoutS3: danglingCount,
    dbFilesWithoutS3Size: danglingSize,
    s3FilesWithoutDb: s3OrphanCount,
    s3FilesWithoutDbSize: s3OrphanSize,
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
    s3Sizes: Map<string, number>;
    s3BatchSize: number;
    dbBatchSize: number;
    logger: ReturnType<typeof getLoggerStore>;
    throwIfAborted: (phase: string) => void;
  },
): Promise<number> {
  const { s3Sizes, s3BatchSize, dbBatchSize, logger, throwIfAborted } = ctx;

  const keysToDelete: string[] = [];
  for (const f of orphans) {
    if (s3Sizes.has(f.filePath)) keysToDelete.push(f.filePath);
    if (f.safeFilePath && s3Sizes.has(f.safeFilePath)) keysToDelete.push(f.safeFilePath);
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
      const filePathOk = !s3Sizes.has(f.filePath) || !failedKeys.has(f.filePath);
      const safePathOk = !f.safeFilePath || !s3Sizes.has(f.safeFilePath) || !failedKeys.has(f.safeFilePath);
      return filePathOk && safePathOk;
    })
    .map((f) => f.id);

  return removeDbRowsByIds(removableIds, dbBatchSize, logger, throwIfAborted, 'orphan');
}

const isS3NotFoundError = (err: unknown): boolean => {
  const code = (err as { code?: string } | null)?.code;
  return code === 'NotFound' || code === 'NoSuchKey';
};

/**
 * Keeps only the candidates whose S3 object is confirmed missing by a fresh
 * `statObject`. Any other outcome (object found, or a stat error other than
 * "not found") drops the candidate: when in doubt, the row is kept.
 */
async function confirmDangling(candidates: DbFile[], logger: ReturnType<typeof getLoggerStore>): Promise<DbFile[]> {
  const confirmed: DbFile[] = [];
  let falsePositives = 0;
  for (const batch of chunk(candidates, DANGLING_RECHECK_CONCURRENCY)) {
    const missing = await Promise.all(
      batch.map(async (f) => {
        try {
          await statMinioObject(f.filePath);
          falsePositives++;
          return false;
        } catch (err) {
          if (isS3NotFoundError(err)) return true;
          logger.error({ err, id: f.id, filePath: f.filePath }, 'Failed to re-check dangling candidate, keeping it');
          return false;
        }
      }),
    );
    batch.forEach((f, i) => {
      if (missing[i]) confirmed.push(f);
    });
  }
  if (falsePositives > 0) {
    logger.info({ count: falsePositives }, 'Dangling candidates found in S3 on re-check (uploaded during the scan)');
  }
  return confirmed;
}

/**
 * Keeps only the S3 keys that no `uploadedFile` row references (as `filePath`
 * or `safeFilePath`) according to a fresh DB query. If a query fails, its
 * whole batch is dropped: when in doubt, the S3 object is kept.
 */
async function confirmS3Orphans(
  keys: string[],
  batchSize: number,
  logger: ReturnType<typeof getLoggerStore>,
  throwIfAborted: (phase: string) => void,
): Promise<string[]> {
  const confirmed: string[] = [];
  let falsePositives = 0;
  for (const batch of chunk(keys, batchSize)) {
    throwIfAborted('orphan-s3-recheck');
    try {
      const rows = await prisma.uploadedFile.findMany({
        select: { filePath: true, safeFilePath: true },
        where: { OR: [{ filePath: { in: batch } }, { safeFilePath: { in: batch } }] },
      });
      const referenced = new Set<string>();
      for (const r of rows) {
        referenced.add(r.filePath);
        if (r.safeFilePath) referenced.add(r.safeFilePath);
      }
      for (const key of batch) {
        if (referenced.has(key)) falsePositives++;
        else confirmed.push(key);
      }
    } catch (err) {
      logger.error({ err, count: batch.length }, 'Failed to re-check S3 orphan candidates, keeping them');
    }
  }
  if (falsePositives > 0) {
    logger.info({ count: falsePositives }, 'S3 orphan candidates found in DB on re-check (written during the scan)');
  }
  return confirmed;
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
  keys: string[],
  s3BatchSize: number,
  logger: ReturnType<typeof getLoggerStore>,
  throwIfAborted: (phase: string) => void,
): Promise<number> {
  let removed = 0;
  for (const batch of chunk(keys, s3BatchSize)) {
    throwIfAborted('remove-orphans-s3-only');
    try {
      const errors = await deleteFilesFromMinio(batch);
      removed += batch.length - errors.length;
      if (errors.length > 0) {
        logger.error({ count: errors.length, sample: errors.slice(0, 5) }, 'Some S3-only orphan deletions failed');
      }
    } catch (err) {
      logger.error({ err, count: batch.length }, 'Failed to delete S3 batch of orphan objects');
    }
  }
  return removed;
}
