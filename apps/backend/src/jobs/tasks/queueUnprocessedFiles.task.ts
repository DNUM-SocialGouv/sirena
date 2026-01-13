import type { Job } from 'bullmq';
import { getUnprocessedFiles } from '@/features/uploadedFiles/uploadedFiles.service';
import { withCronLifecycle } from '@/jobs/config/job.utils';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import type { JobDataMap, JobResult } from '../config/job.types';
import { addFileProcessingJob } from '../queues/fileProcessing.queue';

export async function queueUnprocessedFiles(job: Job<JobDataMap['queue-unprocessed-files']>): JobResult {
  const logger = getLoggerStore();

  await withCronLifecycle(job, {}, async () => {
    const unprocessedFiles = await getUnprocessedFiles();

    if (unprocessedFiles.length === 0) {
      logger.debug('No unprocessed files found');
      return { queuedCount: 0, skippedCount: 0 };
    }

    let queuedCount = 0;
    let skippedCount = 0;

    for (const file of unprocessedFiles) {
      const added = await addFileProcessingJob({
        fileId: file.id,
        fileName: file.fileName,
        filePath: file.filePath,
        mimeType: file.mimeType,
      });

      if (added) {
        queuedCount++;
        logger.debug({ fileId: file.id }, 'Queued unprocessed file');
      } else {
        skippedCount++;
      }
    }

    if (queuedCount > 0) {
      logger.info({ queuedCount, skippedCount }, 'Finished queueing unprocessed files');
    }

    return { queuedCount, skippedCount };
  });
}
