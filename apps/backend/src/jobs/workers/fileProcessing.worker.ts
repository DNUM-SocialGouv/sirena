import { type Job, Worker } from 'bullmq';
import type { Logger } from 'pino';
import { envVars } from '@/config/env';
import { connection } from '@/config/redis';
import {
  getUploadedFileByIdInternal,
  updateFileProcessingStatus,
} from '@/features/uploadedFiles/uploadedFiles.service';
import { createDefaultLogger } from '@/helpers/pino';
import { getLoggerStore, loggerStorage } from '@/libs/asyncLocalStorage';
import { getDetectedViruses, isFileInfected, scanBuffer, scanStream } from '@/libs/clamav';
import { getFileBuffer, getFileStream, uploadFileToMinio } from '@/libs/minio';
import { isPdfMimeType, sanitizePdf } from '@/libs/pdfSanitizer';
import type { FileProcessingJobData } from '../queues/fileProcessing.queue';

const isClamAvEnabled = (): boolean => {
  return Boolean(envVars.CLAMAV_HOST && envVars.CLAMAV_HOST.length > 0);
};

/**
 * Process non-PDF files using streaming (lower memory footprint)
 */
const processNonPdfFile = async (fileId: string, fileName: string, filePath: string, logger: Logger): Promise<void> => {
  if (isClamAvEnabled()) {
    try {
      const { stream } = await getFileStream(filePath);
      const scanResult = await scanStream(stream, fileName);

      if (!scanResult.success) {
        logger.error({ error: scanResult.error }, 'Virus scan failed');
        await updateFileProcessingStatus(fileId, {
          scanStatus: 'ERROR',
          processingError: scanResult.error || 'Virus scan failed',
          sanitizeStatus: 'SKIPPED',
          status: 'COMPLETED',
        });
        return;
      }

      if (isFileInfected(scanResult)) {
        const viruses = getDetectedViruses(scanResult);
        logger.warn({ viruses }, 'File is infected');
        await updateFileProcessingStatus(fileId, {
          scanStatus: 'INFECTED',
          scanResult: scanResult.data,
          sanitizeStatus: 'SKIPPED',
          processingError: `Virus detected: ${viruses.join(', ')}`,
          status: 'FAILED',
        });
        return;
      }

      logger.info('File is clean');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'CLEAN',
        scanResult: scanResult.data,
        sanitizeStatus: 'SKIPPED',
        status: 'COMPLETED',
      });
    } catch (err) {
      logger.error({ error: err }, 'Failed to scan file');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'ERROR',
        sanitizeStatus: 'SKIPPED',
        processingError: 'Failed to scan file',
        status: 'FAILED',
      });
    }
  } else {
    logger.info('ClamAV not configured, skipping scan');
    await updateFileProcessingStatus(fileId, {
      scanStatus: 'SKIPPED',
      sanitizeStatus: 'SKIPPED',
      status: 'COMPLETED',
    });
  }
};

/**
 * Process PDF files - requires buffer for sanitization (pdf-lib limitation)
 */
const processPdfFile = async (
  fileId: string,
  fileName: string,
  filePath: string,
  mimeType: string,
  logger: Logger,
): Promise<void> => {
  let fileBuffer: Buffer;
  try {
    fileBuffer = await getFileBuffer(filePath);
  } catch (err) {
    logger.error({ error: err }, 'Failed to download file from storage');
    await updateFileProcessingStatus(fileId, {
      scanStatus: 'ERROR',
      sanitizeStatus: 'ERROR',
      processingError: 'Failed to download file from storage',
      status: 'FAILED',
    });
    return;
  }

  // Scan with ClamAV
  if (isClamAvEnabled()) {
    const scanResult = await scanBuffer(fileBuffer, fileName);

    if (!scanResult.success) {
      logger.error({ error: scanResult.error }, 'Virus scan failed');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'ERROR',
        processingError: scanResult.error || 'Virus scan failed',
      });
    } else if (isFileInfected(scanResult)) {
      const viruses = getDetectedViruses(scanResult);
      logger.warn({ viruses }, 'File is infected');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'INFECTED',
        scanResult: scanResult.data,
        sanitizeStatus: 'SKIPPED',
        processingError: `Virus detected: ${viruses.join(', ')}`,
        status: 'FAILED',
      });
      return;
    } else {
      logger.info('File is clean');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'CLEAN',
        scanResult: scanResult.data,
      });
    }
  } else {
    logger.info('ClamAV not configured, skipping scan');
    await updateFileProcessingStatus(fileId, {
      scanStatus: 'SKIPPED',
    });
  }

  // Sanitize PDF
  await updateFileProcessingStatus(fileId, {
    sanitizeStatus: 'SANITIZING',
  });

  try {
    const sanitizedBuffer = await sanitizePdf(fileBuffer);

    const safeFileName = `safe_${fileName}`;
    const { objectPath: safeFilePath } = await uploadFileToMinio(sanitizedBuffer, safeFileName, mimeType);

    logger.info({ safeFilePath }, 'PDF sanitized successfully');

    await updateFileProcessingStatus(fileId, {
      sanitizeStatus: 'COMPLETED',
      safeFilePath,
      status: 'COMPLETED',
    });
  } catch (err) {
    logger.error({ error: err }, 'PDF sanitization failed');
    await updateFileProcessingStatus(fileId, {
      sanitizeStatus: 'ERROR',
      processingError: err instanceof Error ? err.message : 'PDF sanitization failed',
      status: 'COMPLETED',
    });
  }
};

const processFile = async (job: Job<FileProcessingJobData>): Promise<void> => {
  const { fileId, fileName, filePath, mimeType } = job.data;

  return loggerStorage.run(
    createDefaultLogger().child({ context: 'file-processing-worker', fileId, jobId: job.id }),
    async () => {
      const logger = getLoggerStore();
      logger.info({ fileName }, 'Starting file processing');

      try {
        const file = await getUploadedFileByIdInternal(fileId);
        if (!file) {
          logger.warn('File not found, skipping processing');
          return;
        }

        await updateFileProcessingStatus(fileId, {
          scanStatus: 'SCANNING',
          status: 'PROCESSING',
        });

        // For PDFs: buffer needed for sanitization (pdf-lib limitation)
        // For other files: use streaming to reduce memory footprint
        if (isPdfMimeType(mimeType)) {
          await processPdfFile(fileId, fileName, filePath, mimeType, logger);
        } else {
          await processNonPdfFile(fileId, fileName, filePath, logger);
        }

        logger.info('File processing completed');
      } catch (error) {
        logger.error({ error }, 'Unexpected error during file processing');
        await updateFileProcessingStatus(fileId, {
          processingError: error instanceof Error ? error.message : 'Unknown error',
          status: 'FAILED',
        });
        throw error;
      }
    },
  );
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

  const eventLogger = createDefaultLogger().child({ context: 'file-processing-worker' });

  worker.on('completed', (job) => {
    eventLogger.info({ jobId: job.id, fileId: job.data.fileId }, 'File processing job completed');
  });

  worker.on('failed', (job, err) => {
    eventLogger.error({ jobId: job?.id, fileId: job?.data.fileId, error: err }, 'File processing job failed');
  });

  return worker;
};
