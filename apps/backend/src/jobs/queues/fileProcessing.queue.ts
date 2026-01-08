import { Queue } from 'bullmq';
import { connection } from '@/config/redis';

export interface FileProcessingJobData {
  fileId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
}

export const fileProcessingQueue = new Queue<FileProcessingJobData>('file-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
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

export const addFileProcessingJob = async (data: FileProcessingJobData): Promise<void> => {
  const jobId = `file-${data.fileId}`;
  const existingJob = await fileProcessingQueue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();
    if (state === 'completed' || state === 'failed') {
      await existingJob.remove();
    } else {
      return;
    }
  }

  await fileProcessingQueue.add('process-file', data, { jobId });
};
