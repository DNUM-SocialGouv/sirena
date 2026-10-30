import { Queue } from 'bullmq';
import { connection } from '../../config/redis.js';

export const DOCUMENT_EXPORT_QUEUE_NAME = 'document-export';

export const DOCUMENT_EXPORT_JOB_NAMES = {
  GENERATE: 'generate',
  // Deletes the file once its download link expires.
  EXPIRE: 'expire',
} as const;

export interface DocumentExportJobData {
  documentExportId: string;
}

export const documentExportQueue = new Queue<DocumentExportJobData>(DOCUMENT_EXPORT_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    // A transient database or storage failure is retried; past that the export is marked FAILED
    // and the user can ask for a new one.
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10_000,
    },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 7 * 86400, count: 1000 },
  },
});

export const addDocumentExportJob = async (documentExportId: string): Promise<void> => {
  await documentExportQueue.add(
    DOCUMENT_EXPORT_JOB_NAMES.GENERATE,
    { documentExportId },
    { jobId: `document-export-${documentExportId}` },
  );
};

export const addDocumentExportExpiryJob = async (documentExportId: string, delayMs: number): Promise<void> => {
  await documentExportQueue.add(
    DOCUMENT_EXPORT_JOB_NAMES.EXPIRE,
    { documentExportId },
    { jobId: `document-export-expire-${documentExportId}`, delay: delayMs },
  );
};
