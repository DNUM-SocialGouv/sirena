import { type Job, Worker } from 'bullmq';
import { envVars } from '@/config/env';
import { connection } from '@/config/redis';
import {
  getUploadedFileByIdInternal,
  updateFileProcessingStatus,
} from '@/features/uploadedFiles/uploadedFiles.service';
import { createDefaultLogger } from '@/helpers/pino';
import { getDetectedViruses, isFileInfected, scanBuffer } from '@/libs/clamav';
import { getFileBuffer, uploadFileToMinio } from '@/libs/minio';
import { isPdfMimeType, sanitizePdf } from '@/libs/pdfSanitizer';
import type { FileProcessingJobData } from '../queues/fileProcessing.queue';

const logger = createDefaultLogger().child({ context: 'file-processing-worker' });

const isClamAvEnabled = (): boolean => {
  return Boolean(envVars.CLAMAV_HOST && envVars.CLAMAV_HOST.length > 0);
};

const processFile = async (job: Job<FileProcessingJobData>): Promise<void> => {
  const { fileId, fileName, filePath, mimeType } = job.data;

  logger.info({ fileId, fileName }, 'Starting file processing');

  try {
    const file = await getUploadedFileByIdInternal(fileId);
    if (!file) {
      logger.warn({ fileId }, 'File not found, skipping processing');
      return;
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await getFileBuffer(filePath);
    } catch (err) {
      logger.error({ fileId, error: err }, 'Failed to download file from storage');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'ERROR',
        sanitizeStatus: 'ERROR',
        processingError: 'Failed to download file from storage',
        status: 'FAILED',
      });
      return;
    }

    await updateFileProcessingStatus(fileId, {
      scanStatus: 'SCANNING',
      status: 'PROCESSING',
    });

    if (isClamAvEnabled()) {
      const scanResult = await scanBuffer(fileBuffer, fileName);

      if (!scanResult.success) {
        logger.error({ fileId, error: scanResult.error }, 'Virus scan failed');
        await updateFileProcessingStatus(fileId, {
          scanStatus: 'ERROR',
          processingError: scanResult.error || 'Virus scan failed',
        });
      } else if (isFileInfected(scanResult)) {
        const viruses = getDetectedViruses(scanResult);
        logger.warn({ fileId, viruses }, 'File is infected');
        await updateFileProcessingStatus(fileId, {
          scanStatus: 'INFECTED',
          scanResult: scanResult.data,
          sanitizeStatus: 'SKIPPED',
          processingError: `Virus detected: ${viruses.join(', ')}`,
          status: 'FAILED',
        });
        return;
      } else {
        logger.info({ fileId }, 'File is clean');
        await updateFileProcessingStatus(fileId, {
          scanStatus: 'CLEAN',
          scanResult: scanResult.data,
        });
      }
    } else {
      logger.info({ fileId }, 'ClamAV not configured, skipping scan');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'SKIPPED',
      });
    }

    if (isPdfMimeType(mimeType)) {
      await updateFileProcessingStatus(fileId, {
        sanitizeStatus: 'SANITIZING',
      });

      try {
        const sanitizedBuffer = await sanitizePdf(fileBuffer);

        const safeFileName = `safe_${fileName}`;
        const { objectPath: safeFilePath } = await uploadFileToMinio(sanitizedBuffer, safeFileName, mimeType);

        logger.info({ fileId, safeFilePath }, 'PDF sanitized successfully');

        await updateFileProcessingStatus(fileId, {
          sanitizeStatus: 'COMPLETED',
          safeFilePath,
          status: 'COMPLETED',
        });
      } catch (err) {
        logger.error({ fileId, error: err }, 'PDF sanitization failed');
        await updateFileProcessingStatus(fileId, {
          sanitizeStatus: 'ERROR',
          processingError: err instanceof Error ? err.message : 'PDF sanitization failed',
          status: 'COMPLETED',
        });
      }
    } else {
      logger.info({ fileId, mimeType }, 'File is not a PDF, skipping sanitization');
      await updateFileProcessingStatus(fileId, {
        sanitizeStatus: 'SKIPPED',
        status: 'COMPLETED',
      });
    }

    logger.info({ fileId }, 'File processing completed');
  } catch (error) {
    logger.error({ fileId, error }, 'Unexpected error during file processing');
    await updateFileProcessingStatus(fileId, {
      processingError: error instanceof Error ? error.message : 'Unknown error',
      status: 'FAILED',
    });
    throw error;
  }
};

export const createFileProcessingWorker = (): Worker<FileProcessingJobData> => {
  const worker = new Worker<FileProcessingJobData>('file-processing', processFile, {
    connection,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000,
    },
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, fileId: job.data.fileId }, 'File processing job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, fileId: job?.data.fileId, error: err }, 'File processing job failed');
  });

  return worker;
};
