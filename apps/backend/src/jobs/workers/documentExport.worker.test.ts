import { Readable } from 'node:stream';
import { type Job, Worker } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyDocumentExportReady } from '../../features/documentExports/documentExports.notification.service.js';
import {
  getDocumentExportForProcessing,
  getDocumentExportStoredFile,
  markDocumentExportFailed,
  markDocumentExportProcessing,
  markDocumentExportReady,
  markDocumentExportsExpired,
} from '../../features/documentExports/documentExports.service.js';
import { hasFeature } from '../../features/featureFlags/featureFlags.service.js';
import { recordDocumentExport } from '../../features/monitoring/metrics.worker.js';
import { generateExportRequetesDocument } from '../../features/statistics/exportRequetes/exportRequetesDocument.js';
import { deleteFilesFromMinio, uploadFileToMinio } from '../../libs/minio.js';
import { addDocumentExportExpiryJob, type DocumentExportJobData } from '../queues/documentExport.queue.js';
import {
  createDocumentExportWorker,
  processDocumentExport,
  processDocumentExportExpiry,
} from './documentExport.worker.js';

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
  DOCUMENT_EXPORT_JOB_NAMES: { GENERATE: 'generate', EXPIRE: 'expire' },
  addDocumentExportExpiryJob: vi.fn(),
}));

vi.mock('../../features/monitoring/metrics.worker.js', () => ({
  recordDocumentExport: vi.fn(),
}));

vi.mock('../../libs/minio.js', () => ({
  uploadFileToMinio: vi.fn(),
  deleteFilesFromMinio: vi.fn(),
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
  DOCUMENT_EXPORT_TTL_MS: 30 * 60 * 1000,
  getDocumentExportForProcessing: vi.fn(),
  getDocumentExportStoredFile: vi.fn(),
  markDocumentExportsExpired: vi.fn(),
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
    expect(addDocumentExportExpiryJob).toHaveBeenCalledWith('export-1', expect.any(Number));
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
  it('schedules the file deletion at the link expiry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-26T10:00:00.000Z'));
    try {
      await processDocumentExport(job);
    } finally {
      vi.useRealTimers();
    }

    // markDocumentExportReady resolves expiresAt at 10:30.
    expect(addDocumentExportExpiryJob).toHaveBeenCalledWith('export-1', 30 * 60 * 1000);
  });

  it('still notifies the requester when the deletion cannot be scheduled', async () => {
    vi.mocked(addDocumentExportExpiryJob).mockRejectedValueOnce(new Error('redis down'));

    await expect(processDocumentExport(job)).resolves.toBeUndefined();
    expect(notifyDocumentExportReady).toHaveBeenCalled();
  });

  it('routes the expiry jobs to the deletion of the file', async () => {
    createDocumentExportWorker();
    const processor = vi.mocked(Worker).mock.calls.at(-1)?.[1] as (job: Job<DocumentExportJobData>) => Promise<void>;
    vi.mocked(getDocumentExportStoredFile).mockResolvedValueOnce(null);

    await processor({ ...job, name: 'expire' } as Job<DocumentExportJobData>);

    expect(getDocumentExportStoredFile).toHaveBeenCalledWith('export-1');
    expect(getDocumentExportForProcessing).not.toHaveBeenCalled();
  });

  it('does not fail the export when its expiry job fails', async () => {
    createDocumentExportWorker();
    const worker = vi.mocked(Worker).mock.results.at(-1)?.value as { on: ReturnType<typeof vi.fn> };
    const onFailed = worker.on.mock.calls.find(([event]) => event === 'failed')?.[1] as (
      job: unknown,
      err: Error,
    ) => void;

    onFailed(
      { id: 'job-2', name: 'expire', data: { documentExportId: 'export-1' }, attemptsMade: 3, opts: { attempts: 3 } },
      new Error('x'),
    );

    expect(markDocumentExportFailed).not.toHaveBeenCalled();
  });

  describe('processDocumentExportExpiry', () => {
    const expireJob = {
      id: 'job-2',
      name: 'expire',
      data: { documentExportId: 'export-1' },
    } as Job<DocumentExportJobData>;

    it('deletes the expired file, then marks the export expired', async () => {
      vi.mocked(getDocumentExportStoredFile).mockResolvedValueOnce({
        id: 'export-1',
        filePath: 'exports/abc.csv',
        expiresAt: new Date(Date.now() - 1000),
      });
      vi.mocked(deleteFilesFromMinio).mockResolvedValueOnce([]);

      await processDocumentExportExpiry(expireJob);

      expect(deleteFilesFromMinio).toHaveBeenCalledWith(['exports/abc.csv']);
      expect(markDocumentExportsExpired).toHaveBeenCalledWith(['export-1']);
    });

    it('does nothing when the purge already deleted the file', async () => {
      vi.mocked(getDocumentExportStoredFile).mockResolvedValueOnce({ id: 'export-1', filePath: null, expiresAt: null });

      await processDocumentExportExpiry(expireJob);

      expect(deleteFilesFromMinio).not.toHaveBeenCalled();
      expect(markDocumentExportsExpired).not.toHaveBeenCalled();
    });

    it('keeps a file whose link is still valid', async () => {
      vi.mocked(getDocumentExportStoredFile).mockResolvedValueOnce({
        id: 'export-1',
        filePath: 'exports/abc.csv',
        expiresAt: new Date(Date.now() + 60_000),
      });

      await processDocumentExportExpiry(expireJob);

      expect(deleteFilesFromMinio).not.toHaveBeenCalled();
    });

    it('fails, to be retried, when the file cannot be deleted', async () => {
      vi.mocked(getDocumentExportStoredFile).mockResolvedValueOnce({
        id: 'export-1',
        filePath: 'exports/abc.csv',
        expiresAt: new Date(Date.now() - 1000),
      });
      vi.mocked(deleteFilesFromMinio).mockResolvedValueOnce([{ key: 'exports/abc.csv', message: 'AccessDenied' }]);

      await expect(processDocumentExportExpiry(expireJob)).rejects.toThrow('AccessDenied');
      expect(markDocumentExportsExpired).not.toHaveBeenCalled();
    });
  });
});
