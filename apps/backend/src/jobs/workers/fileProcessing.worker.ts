import { type Job, Worker } from 'bullmq';
import type { Logger } from 'pino';
import { envVars } from '../../config/env.js';
import { connection } from '../../config/redis.js';
import {
  recordClamavError,
  recordClamavHealth,
  recordClamavScanDuration,
  recordFileProcessing,
  recordFileScanSize,
} from '../../features/monitoring/metrics.worker.js';
import {
  getUploadedFileByIdInternal,
  tryAcquireProcessingLock,
  updateFileProcessingStatus,
} from '../../features/uploadedFiles/uploadedFiles.service.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { getLoggerStore, loggerStorage } from '../../libs/asyncLocalStorage.js';
import {
  categorizeClamAvError,
  checkClamAvHealth,
  getDetectedViruses,
  isFileInfected,
  scanBuffer,
  scanStream,
} from '../../libs/clamav.js';
import { getFileBuffer, getFileStream, uploadFileToMinio } from '../../libs/minio.js';
import { isPdfMimeType, sanitizePdf } from '../../libs/pdfSanitizer.js';
import type { FileProcessingJobData } from '../queues/fileProcessing.queue.js';

interface ProcessingResult {
  scanStatus: string;
  sanitizeStatus: string;
}

const isClamAvEnabled = (): boolean => {
  return Boolean(envVars.CLAMAV_HOST && envVars.CLAMAV_HOST.length > 0);
};

class TransientScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransientScanError';
  }
}

const ensureClamAvReachable = async (): Promise<void> => {
  const health = await checkClamAvHealth();
  recordClamavHealth(health.status === 'ok', health.clamav.latencyMs ?? 0);
  if (health.status !== 'ok') {
    throw new TransientScanError(`ClamAV is not reachable: ${health.clamav.message}`);
  }
};

const processNonPdfFile = async (
  fileId: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  logger: Logger,
): Promise<ProcessingResult> => {
  if (!isClamAvEnabled()) {
    logger.info('ClamAV not configured, skipping scan');
    await updateFileProcessingStatus(fileId, {
      scanStatus: 'SKIPPED',
      sanitizeStatus: 'SKIPPED',
      status: 'COMPLETED',
    });
    return { scanStatus: 'SKIPPED', sanitizeStatus: 'SKIPPED' };
  }

  await ensureClamAvReachable();

  const scanStartTime = Date.now();
  try {
    const { stream } = await getFileStream(filePath);
    const scanResult = await scanStream(stream, fileName, fileSize);
    const scanDurationSeconds = (Date.now() - scanStartTime) / 1000;

    if (!scanResult.success) {
      recordClamavError(scanResult.errorReason ?? 'unknown');
      recordClamavScanDuration('other', 'ERROR', scanDurationSeconds);
      recordFileScanSize('ERROR', fileSize);

      if (scanResult.errorReason === 'timeout' || scanResult.errorReason === 'connection_refused') {
        throw new TransientScanError(scanResult.error || 'Virus scan failed');
      }

      logger.error({ error: scanResult.error }, 'Virus scan failed');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'ERROR',
        processingError: scanResult.error || 'Virus scan failed',
        sanitizeStatus: 'SKIPPED',
        status: 'FAILED',
      });
      return { scanStatus: 'ERROR', sanitizeStatus: 'SKIPPED' };
    }

    if (isFileInfected(scanResult)) {
      const viruses = getDetectedViruses(scanResult);
      logger.warn({ viruses }, 'File is infected');
      recordClamavScanDuration('other', 'INFECTED', scanDurationSeconds);
      recordFileScanSize('INFECTED', fileSize);
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'INFECTED',
        scanResult: scanResult.data,
        sanitizeStatus: 'SKIPPED',
        processingError: `Virus detected: ${viruses.join(', ')}`,
        status: 'FAILED',
      });
      return { scanStatus: 'INFECTED', sanitizeStatus: 'SKIPPED' };
    }

    logger.info('File is clean');
    recordClamavScanDuration('other', 'CLEAN', scanDurationSeconds);
    recordFileScanSize('CLEAN', fileSize);
    await updateFileProcessingStatus(fileId, {
      scanStatus: 'CLEAN',
      scanResult: scanResult.data,
      sanitizeStatus: 'SKIPPED',
      status: 'COMPLETED',
    });
    return { scanStatus: 'CLEAN', sanitizeStatus: 'SKIPPED' };
  } catch (err) {
    if (err instanceof TransientScanError) {
      throw err;
    }
    logger.error({ error: err }, 'Failed to scan file');
    const scanDurationSeconds = (Date.now() - scanStartTime) / 1000;
    recordClamavError(categorizeClamAvError(err));
    recordClamavScanDuration('other', 'ERROR', scanDurationSeconds);
    recordFileScanSize('ERROR', fileSize);
    await updateFileProcessingStatus(fileId, {
      scanStatus: 'ERROR',
      sanitizeStatus: 'SKIPPED',
      processingError: 'Failed to scan file',
      status: 'FAILED',
    });
    return { scanStatus: 'ERROR', sanitizeStatus: 'SKIPPED' };
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
  fileSize: number,
  logger: Logger,
): Promise<ProcessingResult> => {
  let fileBuffer: Buffer;
  let scanStatus = 'SKIPPED';

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
    return { scanStatus: 'ERROR', sanitizeStatus: 'ERROR' };
  }

  if (isClamAvEnabled()) {
    await ensureClamAvReachable();

    const scanStartTime = Date.now();
    const scanResult = await scanBuffer(fileBuffer, fileName);
    const scanDurationSeconds = (Date.now() - scanStartTime) / 1000;

    if (!scanResult.success) {
      recordClamavError(scanResult.errorReason ?? 'unknown');
      recordClamavScanDuration('pdf', 'ERROR', scanDurationSeconds);
      recordFileScanSize('ERROR', fileSize);

      if (scanResult.errorReason === 'timeout' || scanResult.errorReason === 'connection_refused') {
        throw new TransientScanError(scanResult.error || 'Virus scan failed');
      }

      logger.error({ error: scanResult.error }, 'Virus scan failed');
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'ERROR',
        sanitizeStatus: 'SKIPPED',
        processingError: scanResult.error || 'Virus scan failed',
        status: 'FAILED',
      });
      return { scanStatus: 'ERROR', sanitizeStatus: 'SKIPPED' };
    }

    if (isFileInfected(scanResult)) {
      const viruses = getDetectedViruses(scanResult);
      logger.warn({ viruses }, 'File is infected');
      recordClamavScanDuration('pdf', 'INFECTED', scanDurationSeconds);
      recordFileScanSize('INFECTED', fileSize);
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'INFECTED',
        scanResult: scanResult.data,
        sanitizeStatus: 'SKIPPED',
        processingError: `Virus detected: ${viruses.join(', ')}`,
        status: 'FAILED',
      });
      return { scanStatus: 'INFECTED', sanitizeStatus: 'SKIPPED' };
    }

    logger.info('File is clean');
    scanStatus = 'CLEAN';
    recordClamavScanDuration('pdf', 'CLEAN', scanDurationSeconds);
    recordFileScanSize('CLEAN', fileSize);
    await updateFileProcessingStatus(fileId, {
      scanStatus: 'CLEAN',
      scanResult: scanResult.data,
    });
  } else {
    logger.info('ClamAV not configured, skipping scan');
    await updateFileProcessingStatus(fileId, {
      scanStatus: 'SKIPPED',
    });
  }

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
    return { scanStatus, sanitizeStatus: 'COMPLETED' };
  } catch (err) {
    logger.error({ error: err }, 'PDF sanitization failed');
    await updateFileProcessingStatus(fileId, {
      sanitizeStatus: 'ERROR',
      processingError: err instanceof Error ? err.message : 'PDF sanitization failed',
      status: 'COMPLETED',
    });
    return { scanStatus, sanitizeStatus: 'ERROR' };
  }
};

const processFile = async (job: Job<FileProcessingJobData>): Promise<void> => {
  const { fileId, fileName, filePath, mimeType } = job.data;

  return loggerStorage.run(
    createDefaultLogger().child({ context: 'file-processing-worker', fileId, jobId: job.id }),
    async () => {
      const logger = getLoggerStore();
      logger.info({ fileName }, 'Starting file processing');

      const startTime = Date.now();
      const fileType = isPdfMimeType(mimeType) ? 'pdf' : 'other';

      try {
        const file = await getUploadedFileByIdInternal(fileId);
        if (!file) {
          logger.warn('File not found, skipping processing');
          return;
        }

        const acquired = await tryAcquireProcessingLock(fileId);
        if (!acquired) {
          logger.info('File is already being processed by another worker, skipping');
          return;
        }

        let result: ProcessingResult;
        if (isPdfMimeType(mimeType)) {
          result = await processPdfFile(fileId, fileName, filePath, mimeType, file.size, logger);
        } else {
          result = await processNonPdfFile(fileId, fileName, filePath, file.size, logger);
        }

        const durationSeconds = (Date.now() - startTime) / 1000;
        recordFileProcessing(result.scanStatus, result.sanitizeStatus, fileType, durationSeconds);

        logger.info('File processing completed');
      } catch (error) {
        logger.error({ error }, 'Unexpected error during file processing');
        await updateFileProcessingStatus(fileId, {
          processingError: error instanceof Error ? error.message : 'Unknown error',
          status: 'FAILED',
        });

        const durationSeconds = (Date.now() - startTime) / 1000;
        recordFileProcessing('ERROR', 'ERROR', fileType, durationSeconds);

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
