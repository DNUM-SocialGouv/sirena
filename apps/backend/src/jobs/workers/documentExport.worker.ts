import { FEATURE_FLAGS } from '@sirena/common/constants';
import { type Job, Worker } from 'bullmq';
import { z } from 'zod';
import { connection } from '../../config/redis.js';
import { notifyDocumentExportReady } from '../../features/documentExports/documentExports.notification.service.js';
import {
  DOCUMENT_EXPORT_STATUS,
  DOCUMENT_EXPORT_TYPE,
  getDocumentExportForProcessing,
  markDocumentExportFailed,
  markDocumentExportProcessing,
  markDocumentExportReady,
} from '../../features/documentExports/documentExports.service.js';
import { hasFeature } from '../../features/featureFlags/featureFlags.service.js';
import { recordDocumentExport } from '../../features/monitoring/metrics.worker.js';
import {
  type GeneratedDocument,
  generateExportRequetesDocument,
} from '../../features/statistics/exportRequetes/exportRequetesDocument.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { getLoggerStore, loggerStorage } from '../../libs/asyncLocalStorage.js';
import { uploadFileToMinio } from '../../libs/minio.js';
import { DOCUMENT_EXPORT_QUEUE_NAME, type DocumentExportJobData } from '../queues/documentExport.queue.js';

type DocumentExportToProcess = NonNullable<Awaited<ReturnType<typeof getDocumentExportForProcessing>>>;

const RequetesCsvParamsSchema = z.object({
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

async function generateDocument(documentExport: DocumentExportToProcess): Promise<GeneratedDocument> {
  switch (documentExport.type) {
    case DOCUMENT_EXPORT_TYPE.REQUETES_CSV: {
      const { startDate, endDate } = RequetesCsvParamsSchema.parse(documentExport.params);
      // Evaluated for the requester, like the processing steps screen they read.
      const includeSharedEtapes = await hasFeature(
        FEATURE_FLAGS.SHARED_PROCESSING_STEPS,
        false,
        documentExport.user.email,
        documentExport.user.entiteId,
      );

      return generateExportRequetesDocument({
        topEntiteId: documentExport.topEntiteId,
        startDate,
        endDate,
        includeSharedEtapes,
      });
    }
  }
}

export const processDocumentExport = async (job: Job<DocumentExportJobData>): Promise<void> => {
  const { documentExportId } = job.data;

  return loggerStorage.run(
    createDefaultLogger().child({ context: 'document-export-worker', documentExportId, jobId: job.id }),
    async () => {
      const logger = getLoggerStore();
      const startedAt = Date.now();

      const documentExport = await getDocumentExportForProcessing(documentExportId);
      if (!documentExport) {
        logger.warn('[document-export] Export not found, skipping');
        return;
      }
      if (
        documentExport.status !== DOCUMENT_EXPORT_STATUS.PENDING &&
        documentExport.status !== DOCUMENT_EXPORT_STATUS.PROCESSING
      ) {
        logger.info({ status: documentExport.status }, '[document-export] Export already settled, skipping');
        return;
      }

      await markDocumentExportProcessing(documentExportId);

      const document = await generateDocument(documentExport);
      const upload = await uploadFileToMinio(document.stream, document.fileName, document.mimeType);
      const { rowCount, size } = document.getStats();

      let ready: Awaited<ReturnType<typeof markDocumentExportReady>>;
      try {
        ready = await markDocumentExportReady(documentExportId, {
          fileName: document.fileName,
          filePath: upload.objectPath,
          mimeType: document.mimeType,
          size,
          rowCount,
          encryption: upload.encryptionMetadata,
          generatedAt: new Date(),
        });
      } catch (err) {
        // Without its database record the stored file could never be served nor purged.
        await upload.rollback().catch((rollbackErr) => {
          logger.warn({ err: rollbackErr }, '[document-export] Failed to roll back the stored file');
        });
        throw err;
      }

      const durationMs = Date.now() - startedAt;
      recordDocumentExport({ status: 'success', rowCount, durationSeconds: durationMs / 1000 });
      logger.info({ type: documentExport.type, rowCount, size, durationMs }, '[document-export] Document generated');

      try {
        await notifyDocumentExportReady({ ...ready, user: documentExport.user });
      } catch (err) {
        // The document is stored and stays READY: a notification failure must not regenerate it.
        logger.error({ err }, '[document-export] Failed to notify that the document is ready');
      }
    },
  );
};

export const createDocumentExportWorker = (): Worker<DocumentExportJobData> => {
  const worker = new Worker<DocumentExportJobData>(DOCUMENT_EXPORT_QUEUE_NAME, processDocumentExport, {
    connection,
    // Each job streams a whole export: keep them few at a time to spare the database.
    concurrency: 2,
  });

  const eventLogger = createDefaultLogger().child({ context: 'document-export-worker' });

  worker.on('failed', (job, err) => {
    const documentExportId = job?.data.documentExportId;
    eventLogger.error({ jobId: job?.id, documentExportId, err }, '[document-export] Job failed');

    const isLastAttempt = job != null && job.attemptsMade >= (job.opts.attempts ?? 1);
    if (documentExportId && isLastAttempt) {
      recordDocumentExport({ status: 'error' });
      markDocumentExportFailed(documentExportId, err.message).catch((markErr) => {
        eventLogger.error({ documentExportId, err: markErr }, '[document-export] Failed to mark the export as failed');
      });
    }
  });

  return worker;
};
