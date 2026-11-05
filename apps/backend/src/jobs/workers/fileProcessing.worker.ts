import { type Job, Worker } from 'bullmq';
import type { Logger } from 'pino';
import { envVars } from '../../config/env.js';
import {
  FILE_PROCESSING_CONCURRENCY,
  MAX_PDF_SANITIZATION_SIZE,
  PDF_SANITIZATION_FACTOR,
} from '../../config/files.constant.js';
import { connection } from '../../config/redis.js';
import {
  recordClamavError,
  recordClamavHealth,
  recordClamavScanDuration,
  recordFileProcessing,
  recordFileScanSize,
} from '../../features/monitoring/metrics.worker.js';
import {
  attachSafeFileEncryption,
  getUploadedFileByIdInternal,
  tryAcquireProcessingLock,
  updateFileProcessingStatus,
} from '../../features/uploadedFiles/uploadedFiles.service.js';
import { getFileEncryptionParams } from '../../helpers/file.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { getLoggerStore, loggerStorage } from '../../libs/asyncLocalStorage.js';
import {
  type ClamAvScanResult,
  categorizeClamAvError,
  checkClamAvHealth,
  getDetectedViruses,
  isFileInfected,
  scanStream,
} from '../../libs/clamav.js';
import type { DecryptionParams } from '../../libs/encryption.js';
import { getFileBuffer, getFileStream, uploadFileToMinio } from '../../libs/minio.js';
import { isPdfMimeType, sanitizePdf } from '../../libs/pdfSanitizer.js';
import type { UploadedFile } from '../../libs/prisma.js';
import { isTransientDependencyError } from '../../libs/resilience.js';
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

const toMegabytes = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1);

/**
 * Sanitization is bounded by memory, not by policy: pdf-lib needs the whole file in a Buffer and
 * peaks at roughly PDF_SANITIZATION_FACTOR times its size, so a pod running
 * FILE_PROCESSING_CONCURRENCY jobs cannot afford arbitrarily large PDFs.
 */
const buildOversizedPdfReason = (fileSize: number): string =>
  `PDF sanitization skipped: file is ${toMegabytes(fileSize)}MB, above the ${toMegabytes(
    MAX_PDF_SANITIZATION_SIZE,
  )}MB limit (pdf-lib needs the whole file in memory, ~${PDF_SANITIZATION_FACTOR}x its size, for ${FILE_PROCESSING_CONCURRENCY} concurrent jobs)`;

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
  decryptionParams: DecryptionParams | undefined,
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
    const { stream } = await getFileStream(filePath, decryptionParams);
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
    // Transient failures belong to the caller, which requeues the file: writing a definitive
    // state here would retire the file over a mere outage.
    if (err instanceof TransientScanError || isTransientDependencyError(err)) {
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
 * Process PDF files.
 *
 * The scan is streamed, so the file size never enters the scan memory budget. Only sanitization
 * needs a Buffer (pdf-lib limitation), so the file is downloaded afterwards and only when it fits
 * under MAX_PDF_SANITIZATION_SIZE.
 */
const processPdfFile = async (
  fileId: string,
  fileName: string,
  filePath: string,
  mimeType: string,
  fileSize: number,
  decryptionParams: DecryptionParams | undefined,
  logger: Logger,
): Promise<ProcessingResult> => {
  let scanStatus = 'SKIPPED';

  if (isClamAvEnabled()) {
    await ensureClamAvReachable();

    const scanStartTime = Date.now();
    let scanResult: ClamAvScanResult;

    try {
      const { stream } = await getFileStream(filePath, decryptionParams);
      scanResult = await scanStream(stream, fileName, fileSize);
    } catch (err) {
      // Transient failures belong to the caller, which requeues the file: writing a definitive
      // state here would retire the file over a mere outage.
      if (err instanceof TransientScanError || isTransientDependencyError(err)) {
        throw err;
      }
      logger.error({ error: err }, 'Failed to scan file');
      recordClamavError(categorizeClamAvError(err));
      recordClamavScanDuration('pdf', 'ERROR', (Date.now() - scanStartTime) / 1000);
      recordFileScanSize('ERROR', fileSize);
      await updateFileProcessingStatus(fileId, {
        scanStatus: 'ERROR',
        sanitizeStatus: 'SKIPPED',
        processingError: 'Failed to scan file',
        status: 'FAILED',
      });
      return { scanStatus: 'ERROR', sanitizeStatus: 'SKIPPED' };
    }

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

  if (fileSize > MAX_PDF_SANITIZATION_SIZE) {
    logger.warn({ fileSize, maxSize: MAX_PDF_SANITIZATION_SIZE }, 'PDF too large to sanitize, skipping sanitization');
    await updateFileProcessingStatus(fileId, {
      sanitizeStatus: 'SKIPPED',
      processingError: buildOversizedPdfReason(fileSize),
      status: 'COMPLETED',
    });
    return { scanStatus, sanitizeStatus: 'SKIPPED' };
  }

  await updateFileProcessingStatus(fileId, {
    sanitizeStatus: 'SANITIZING',
  });

  let fileBuffer: Buffer;
  try {
    fileBuffer = await getFileBuffer(filePath, decryptionParams);
  } catch (err) {
    if (isTransientDependencyError(err)) {
      throw err;
    }
    logger.error({ error: err }, 'Failed to download file from storage');
    await updateFileProcessingStatus(fileId, {
      sanitizeStatus: 'ERROR',
      processingError: 'Failed to download file from storage',
      status: 'COMPLETED',
    });
    return { scanStatus, sanitizeStatus: 'ERROR' };
  }

  try {
    const sanitizedBuffer = await sanitizePdf(fileBuffer);
    const safeFileName = `safe_${fileName}`;
    const { objectPath: safeFilePath, encryptionMetadata: safeEncryption } = await uploadFileToMinio(
      sanitizedBuffer,
      safeFileName,
      mimeType,
      sanitizedBuffer.length,
    );

    logger.info({ safeFilePath }, 'PDF sanitized successfully');

    await attachSafeFileEncryption(fileId, safeEncryption);
    await updateFileProcessingStatus(fileId, {
      sanitizeStatus: 'COMPLETED',
      safeFilePath,
      status: 'COMPLETED',
    });
    return { scanStatus, sanitizeStatus: 'COMPLETED' };
  } catch (err) {
    // buildProcessableFileFilter only reconsiders a COMPLETED file on its scanStatus, so the
    // state written below is final: a storage outage here would never be sanitised again.
    if (isTransientDependencyError(err)) {
      throw err;
    }
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

        const decryptionParams = getFileEncryptionParams(file as UploadedFile);

        let result: ProcessingResult;
        if (isPdfMimeType(mimeType)) {
          result = await processPdfFile(fileId, fileName, filePath, mimeType, file.size, decryptionParams, logger);
        } else {
          result = await processNonPdfFile(fileId, fileName, filePath, file.size, decryptionParams, logger);
        }

        const durationSeconds = (Date.now() - startTime) / 1000;
        recordFileProcessing(result.scanStatus, result.sanitizeStatus, fileType, durationSeconds);

        logger.info('File processing completed');
      } catch (error) {
        const durationSeconds = (Date.now() - startTime) / 1000;

        if (error instanceof TransientScanError || isTransientDependencyError(error)) {
          logger.warn({ error }, 'Transient failure during file processing, releasing the file for a retry');
          await updateFileProcessingStatus(fileId, {
            processingError: error instanceof Error ? error.message : 'Unknown error',
            scanStatus: 'PENDING',
            // Reset too: a file interrupted mid-sanitisation would keep advertising SANITIZING.
            sanitizeStatus: 'PENDING',
            status: 'PENDING',
          });
          recordFileProcessing('RETRY', 'RETRY', fileType, durationSeconds);

          throw error;
        }

        logger.error({ error }, 'Unexpected error during file processing');
        await updateFileProcessingStatus(fileId, {
          processingError: error instanceof Error ? error.message : 'Unknown error',
          scanStatus: 'ERROR',
          status: 'FAILED',
        });
        recordFileProcessing('ERROR', 'ERROR', fileType, durationSeconds);

        throw error;
      }
    },
  );
};

export const createFileProcessingWorker = (): Worker<FileProcessingJobData> => {
  const worker = new Worker<FileProcessingJobData>('file-processing', processFile, {
    connection,
    concurrency: FILE_PROCESSING_CONCURRENCY,
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
