import { Readable } from 'node:stream';
import { type Job, Worker } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyDocumentExportReady } from '../../features/documentExports/documentExports.notification.service.js';
import {
  getDocumentExportForProcessing,
  markDocumentExportFailed,
  markDocumentExportProcessing,
  markDocumentExportReady,
} from '../../features/documentExports/documentExports.service.js';
import { hasFeature } from '../../features/featureFlags/featureFlags.service.js';
import { recordDocumentExport } from '../../features/monitoring/metrics.worker.js';
import { generateExportRequetesDocument } from '../../features/statistics/exportRequetes/exportRequetesDocument.js';
import { uploadFileToMinio } from '../../libs/minio.js';
import type { DocumentExportJobData } from '../queues/documentExport.queue.js';
import { createDocumentExportWorker, processDocumentExport } from './documentExport.worker.js';

vi.mock('bullmq', () => ({
  Worker: vi.fn(function MockWorker() {
    return { on: vi.fn() };
  }),
}));

vi.mock('../../config/redis.js', () => ({
  connection: {},
}));

vi.mock('../queues/documentExport.queue.js', () => ({
  DOCUMENT_EXPORT_QUEUE_NAME: 'document-export',
}));

vi.mock('../../features/monitoring/metrics.worker.js', () => ({
  recordDocumentExport: vi.fn(),
}));

vi.mock('../../libs/minio.js', () => ({
  uploadFileToMinio: vi.fn(),
}));

vi.mock('../../features/featureFlags/featureFlags.service.js', () => ({
  hasFeature: vi.fn(),
}));

vi.mock('../../features/statistics/exportRequetes/exportRequetesDocument.js', () => ({
  generateExportRequetesDocument: vi.fn(),
}));

vi.mock('../../features/documentExports/documentExports.notification.service.js', () => ({
  notifyDocumentExportReady: vi.fn(),
}));

vi.mock('../../features/documentExports/documentExports.service.js', () => ({
  DOCUMENT_EXPORT_STATUS: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    READY: 'READY',
    EXPIRED: 'EXPIRED',
    FAILED: 'FAILED',
  },
  DOCUMENT_EXPORT_TYPE: { REQUETES_CSV: 'REQUETES_CSV' },
  getDocumentExportForProcessing: vi.fn(),
  markDocumentExportProcessing: vi.fn(),
  markDocumentExportReady: vi.fn(),
  markDocumentExportFailed: vi.fn(),
}));

const user = { id: 'user-1', email: 'agent@sante.gouv.fr', prenom: 'Jean', nom: 'Dupont', entiteId: 'service-1' };

const pendingExport = {
  id: 'export-1',
  type: 'REQUETES_CSV',
  status: 'PENDING',
  params: { startDate: '2026-09-26', endDate: '2026-10-26' },
  topEntiteId: 'root-entite',
  user,
};

const job = { id: 'job-1', data: { documentExportId: 'export-1' } } as Job<DocumentExportJobData>;

const rollback = vi.fn(async () => {});

describe('documentExport.worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDocumentExportForProcessing).mockResolvedValue(pendingExport as never);
    vi.mocked(hasFeature).mockResolvedValue(false);
    vi.mocked(markDocumentExportProcessing).mockResolvedValue(true);
    vi.mocked(generateExportRequetesDocument).mockResolvedValue({
      fileName: 'export-requetes-sirena_2026-09-26_2026-10-26.csv',
      mimeType: 'text/csv',
      stream: Readable.from(['csv']),
      getStats: () => ({ rowCount: 42, size: 1024 }),
    });
    vi.mocked(uploadFileToMinio).mockResolvedValue({
      objectPath: 'exports/abc.csv',
      encryptionMetadata: { iv: 'iv', authTag: 'tag' },
      rollback,
    });
    vi.mocked(markDocumentExportReady).mockResolvedValue({
      id: 'export-1',
      type: 'REQUETES_CSV',
      fileName: 'export-requetes-sirena_2026-09-26_2026-10-26.csv',
      expiresAt: new Date('2026-10-26T10:30:00.000Z'),
    } as never);
  });

  it('generates the requêtes CSV for the requester perimeter, stores it encrypted and marks it ready', async () => {
    await processDocumentExport(job);

    expect(markDocumentExportProcessing).toHaveBeenCalledWith('export-1');
    expect(hasFeature).toHaveBeenCalledWith('SHARED_PROCESSING_STEPS', false, 'agent@sante.gouv.fr', 'service-1');
    expect(generateExportRequetesDocument).toHaveBeenCalledWith({
      topEntiteId: 'root-entite',
      startDate: '2026-09-26',
      endDate: '2026-10-26',
      includeSharedEtapes: false,
    });
    expect(uploadFileToMinio).toHaveBeenCalledWith(
      expect.any(Readable),
      'export-requetes-sirena_2026-09-26_2026-10-26.csv',
      'text/csv',
    );
    expect(markDocumentExportReady).toHaveBeenCalledWith('export-1', {
      fileName: 'export-requetes-sirena_2026-09-26_2026-10-26.csv',
      filePath: 'exports/abc.csv',
      mimeType: 'text/csv',
      size: 1024,
      rowCount: 42,
      encryption: { iv: 'iv', authTag: 'tag' },
      generatedAt: expect.any(Date),
    });
    expect(notifyDocumentExportReady).toHaveBeenCalledWith(expect.objectContaining({ id: 'export-1', user }));
    expect(recordDocumentExport).toHaveBeenCalledWith({
      status: 'success',
      rowCount: 42,
      durationSeconds: expect.any(Number),
    });
  });

  it('includes the shared steps when the feature flag is on for the requester', async () => {
    vi.mocked(hasFeature).mockResolvedValueOnce(true);

    await processDocumentExport(job);

    expect(generateExportRequetesDocument).toHaveBeenCalledWith(expect.objectContaining({ includeSharedEtapes: true }));
  });

  it.each(['READY', 'EXPIRED', 'FAILED'])(
    'skips an export already %s (job retried after the outcome)',
    async (status) => {
      vi.mocked(getDocumentExportForProcessing).mockResolvedValueOnce({ ...pendingExport, status } as never);

      await processDocumentExport(job);

      expect(markDocumentExportProcessing).not.toHaveBeenCalled();
      expect(uploadFileToMinio).not.toHaveBeenCalled();
    },
  );

  it('removes the stored file when the export cannot be marked ready', async () => {
    const error = new Error('database down');
    vi.mocked(markDocumentExportReady).mockRejectedValueOnce(error);

    await expect(processDocumentExport(job)).rejects.toThrow(error);
    expect(rollback).toHaveBeenCalled();
    expect(notifyDocumentExportReady).not.toHaveBeenCalled();
  });

  it('keeps the export ready when the notification fails', async () => {
    vi.mocked(notifyDocumentExportReady).mockRejectedValueOnce(new Error('mail down'));

    await expect(processDocumentExport(job)).resolves.toBeUndefined();
    expect(rollback).not.toHaveBeenCalled();
  });

  it('marks the export failed once the last attempt has failed', async () => {
    createDocumentExportWorker();
    const worker = vi.mocked(Worker).mock.results.at(-1)?.value as { on: ReturnType<typeof vi.fn> };
    const onFailed = worker.on.mock.calls.find(([event]) => event === 'failed')?.[1] as (
      job: unknown,
      err: Error,
    ) => void;

    onFailed(
      { id: 'job-1', data: { documentExportId: 'export-1' }, attemptsMade: 1, opts: { attempts: 3 } },
      new Error('x'),
    );
    expect(markDocumentExportFailed).not.toHaveBeenCalled();

    vi.mocked(markDocumentExportFailed).mockResolvedValueOnce(true);
    onFailed(
      { id: 'job-1', data: { documentExportId: 'export-1' }, attemptsMade: 3, opts: { attempts: 3 } },
      new Error('x'),
    );
    expect(markDocumentExportFailed).toHaveBeenCalledWith('export-1', 'x');
    await vi.waitFor(() => expect(recordDocumentExport).toHaveBeenCalledWith({ status: 'error' }));
  });

  it('does not count an error when the export was settled before its last failure', async () => {
    createDocumentExportWorker();
    const worker = vi.mocked(Worker).mock.results.at(-1)?.value as { on: ReturnType<typeof vi.fn> };
    const onFailed = worker.on.mock.calls.find(([event]) => event === 'failed')?.[1] as (
      job: unknown,
      err: Error,
    ) => void;
    vi.mocked(markDocumentExportFailed).mockResolvedValueOnce(false);

    onFailed(
      { id: 'job-1', data: { documentExportId: 'export-1' }, attemptsMade: 3, opts: { attempts: 3 } },
      new Error('x'),
    );

    await vi.waitFor(() => expect(markDocumentExportFailed).toHaveBeenCalled());
    await Promise.resolve();
    expect(recordDocumentExport).not.toHaveBeenCalled();
  });

  it('does not generate an export that was settled meanwhile', async () => {
    vi.mocked(markDocumentExportProcessing).mockResolvedValueOnce(false);

    await processDocumentExport(job);

    expect(generateExportRequetesDocument).not.toHaveBeenCalled();
    expect(uploadFileToMinio).not.toHaveBeenCalled();
  });
});
