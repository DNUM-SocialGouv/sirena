import { Queue } from 'bullmq';
import { connection } from '../../config/redis.js';

export interface FileProcessingJobData {
  fileId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
}

export const fileProcessingQueue = new Queue<FileProcessingJobData>('file-processing', {
  connection,
  defaultJobOptions: {
    // 5 attempts with a 10s base cover ~2.5 min (10+20+40+80s), enough for brief outages.
    // Deliberately not sized for the 37 min of the 2026-10-07 incident: the
    // queue-unprocessed-files cron already sweeps PENDING and FAILED/ERROR files hourly (see
    // buildProcessableFileFilter) and requeues them. Holding a job delayed for 42 min would in
    // fact prevent that sweep, since jobId deduplication skips a file already queued.
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10_000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
      count: 500,
    },
  },
});

export const addFileProcessingJob = async (data: FileProcessingJobData): Promise<boolean> => {
  const jobId = `file-${data.fileId}`;
  const existingJob = await fileProcessingQueue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();
    if (state === 'completed' || state === 'failed') {
      await existingJob.remove();
    } else {
      return false;
    }
  }

  await fileProcessingQueue.add('process-file', data, { jobId });
  return true;
};
