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
    // ~2.5 min of retries (10+20+40+80s); past that the hourly queue-unprocessed-files cron
    // requeues the file, and a longer delay would block it since jobId dedup skips queued files.
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
