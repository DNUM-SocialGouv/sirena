import type { Job } from 'bullmq';
import {
  findExpiredDocumentExportFiles,
  markDocumentExportsExpired,
} from '../../features/documentExports/documentExports.service.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { deleteFilesFromMinio } from '../../libs/minio.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

/**
 * Deletes the files of the exports whose download link has expired: they hold personal data and
 * nobody can download them anymore. A file whose deletion fails keeps its export untouched, so the
 * next run retries it.
 */
export async function purgeDocumentExports(job: Job<JobDataMap['purge-document-exports']>): JobResult {
  const { batchSize } = job.data;
  const logger = getLoggerStore();

  await withCronLifecycle(job, { batchSize }, async () => {
    const expired = await findExpiredDocumentExportFiles(new Date(), batchSize);
    if (expired.length === 0) {
      return { expiredCount: 0, purgedCount: 0, failedCount: 0 };
    }

    const errors = await deleteFilesFromMinio(expired.map((documentExport) => documentExport.filePath));
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

    const result = { expiredCount: expired.length, purgedCount, failedCount: errors.length };
    logger.info(result, 'Document export purge: completed');
    return result;
  });
}
