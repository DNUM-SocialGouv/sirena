import type { Job } from 'bullmq';
import {
  deleteDocumentExportsOlderThan,
  failStaleDocumentExports,
  findExpiredDocumentExportFiles,
  markDocumentExportsExpired,
} from '../../features/documentExports/documentExports.service.js';
import { recordDocumentExport } from '../../features/monitoring/metrics.worker.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { deleteFilesFromMinio } from '../../libs/minio.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Housekeeping of the document exports, in three steps:
 * - settles the exports whose generation was lost (still pending or processing past the timeout);
 * - deletes the files whose download link has expired: they hold personal data and nobody can
 *   download them anymore. A file whose deletion fails keeps its export untouched, so the next run
 *   retries it;
 * - drops the settled exports older than the AccessLog retention, like their trace.
 */
export async function purgeDocumentExports(job: Job<JobDataMap['purge-document-exports']>): JobResult {
  const { batchSize, retentionDays } = job.data;
  const logger = getLoggerStore();

  await withCronLifecycle(job, { batchSize, retentionDays }, async () => {
    if (!Number.isInteger(retentionDays) || retentionDays < 1) {
      throw new Error(`Refusing to purge document exports: invalid retentionDays "${retentionDays}"`);
    }

    const now = new Date();

    const staleCount = await failStaleDocumentExports(now);
    if (staleCount > 0) {
      recordDocumentExport({ status: 'error', count: staleCount });
      logger.warn({ staleCount }, 'Document export purge: exports stuck in generation marked as failed');
    }

    const expired = await findExpiredDocumentExportFiles(now, batchSize);
    const errors = expired.length > 0 ? await deleteFilesFromMinio(expired.map(({ filePath }) => filePath)) : [];
    const failedPaths = new Set(errors.map((error) => error.key));
    if (errors.length > 0) {
      logger.error(
        { count: errors.length, sample: errors.slice(0, 5) },
        'Document export purge: some files could not be deleted, retried on the next run',
      );
    }

    const purgedCount = await markDocumentExportsExpired(
      expired.filter((documentExport) => !failedPaths.has(documentExport.filePath)).map(({ id }) => id),
    );

    const deletedCount = await deleteDocumentExportsOlderThan(new Date(now.getTime() - retentionDays * DAY_MS));

    const result = { staleCount, expiredCount: expired.length, purgedCount, failedCount: errors.length, deletedCount };
    logger.info(result, 'Document export purge: completed');
    return result;
  });
}
