import { Readable } from 'node:stream';
import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { envVars } from '../../config/env.js';
import { recordFileProcessing } from '../../features/monitoring/metrics.worker.js';
import { checkClamAvHealth, scanBuffer, scanStream } from '../../libs/clamav.js';
import { getFileBuffer, uploadFileToMinio } from '../../libs/minio.js';
import { sanitizePdf } from '../../libs/pdfSanitizer.js';
import { prisma } from '../../libs/prisma.js';
import type { FileProcessingJobData } from '../queues/fileProcessing.queue.js';
import { createFileProcessingWorker } from './fileProcessing.worker.js';

vi.mock('bullmq', () => ({
  Worker: vi.fn(function MockWorker() {
    return { on: vi.fn() };
  }),
}));

vi.mock('../../config/redis.js', () => ({
  connection: {},
}));

vi.mock('../../features/monitoring/metrics.worker.js', () => ({
  recordClamavError: vi.fn(),
  recordClamavHealth: vi.fn(),
  recordClamavScanDuration: vi.fn(),
  recordFileProcessing: vi.fn(),
  recordFileScanSize: vi.fn(),
}));

vi.mock('../../libs/minio.js', () => ({
  getFileBuffer: vi.fn(async () => Buffer.from('%PDF-1.4')),
  getFileStream: vi.fn(async () => ({ stream: Readable.from(['payload']) })),
  uploadFileToMinio: vi.fn(async () => ({
    objectPath: 'safe/path.pdf',
    encryptionMetadata: { iv: 'iv', authTag: 'tag' },
  })),
}));

vi.mock('../../libs/pdfSanitizer.js', async () => {
  const actual = await vi.importActual<typeof import('../../libs/pdfSanitizer.js')>('../../libs/pdfSanitizer.js');
  return { ...actual, sanitizePdf: vi.fn(async () => Buffer.from('sanitized')) };
});

vi.mock('../../libs/clamav.js', async () => {
  const actual = await vi.importActual<typeof import('../../libs/clamav.js')>('../../libs/clamav.js');
  return {
    ...actual,
    checkClamAvHealth: vi.fn(),
    scanBuffer: vi.fn(),
    scanStream: vi.fn(),
  };
});

vi.mock('../../helpers/sse.js', () => ({
  sseEventManager: { emitFileStatus: vi.fn() },
}));

vi.mock('../../features/changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
}));

type Row = Record<string, unknown>;

const matchesCondition = (value: unknown, condition: unknown): boolean => {
  if (condition === null || typeof condition !== 'object' || condition instanceof Date) {
    return value === condition;
  }
  const { in: within, lt } = condition as { in?: unknown[]; lt?: Date };
  if (within) return within.includes(value);
  if (lt) return value instanceof Date && value < lt;
  throw new Error(`Unsupported condition in test matcher: ${JSON.stringify(condition)}`);
};

const matchesWhere = (row: Row, where: Row): boolean =>
  Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') return (condition as Row[]).some((clause) => matchesWhere(row, clause));
    return matchesCondition(row[key], condition);
  });

const CLEAN_SCAN = { success: true, data: { result: [{ name: 'test.txt', is_infected: false, viruses: [] }] } };
const INFECTED_SCAN = {
  success: true,
  data: { result: [{ name: 'test.txt', is_infected: true, viruses: ['Eicar-Test-Signature'] }] },
};
const CLAMAV_DOWN = { status: 'error', clamav: { reachable: false, message: 'connect ECONNREFUSED' } };
const CLAMAV_UP = { status: 'ok', clamav: { reachable: true, message: 'PONG', latencyMs: 3 } };

describe('fileProcessing.worker.ts', () => {
  let row: Row;

  const job = (mimeType: string): Job<FileProcessingJobData> =>
    ({
      id: 'job-1',
      data: { fileId: 'file1', fileName: 'test.txt', filePath: 'uploads/test.txt', mimeType },
    }) as Job<FileProcessingJobData>;

  const runJob = async (mimeType = 'text/plain'): Promise<void> => {
    createFileProcessingWorker();
    const processor = vi.mocked(Worker).mock.calls.at(-1)?.[1] as (job: Job<FileProcessingJobData>) => Promise<void>;
    await processor(job(mimeType));
  };

  beforeEach(() => {
    vi.clearAllMocks();

    row = {
      id: 'file1',
      fileName: 'test.txt',
      filePath: 'uploads/test.txt',
      mimeType: 'text/plain',
      size: 1024,
      metadata: null,
      status: 'PENDING',
      scanStatus: 'PENDING',
      sanitizeStatus: 'PENDING',
      safeFilePath: null,
      scanResult: null,
      processingError: null,
      entiteId: 'e1',
      updatedAt: new Date(),
    };

    vi.mocked(prisma.uploadedFile.findUnique).mockImplementation((async () => row) as never);
    vi.mocked(prisma.uploadedFile.findUniqueOrThrow).mockImplementation((async () => row) as never);
    vi.mocked(prisma.uploadedFile.update).mockImplementation((async ({ data }: { data: Row }) => {
      row = { ...row, ...data, updatedAt: new Date() };
      return row;
    }) as never);
    vi.mocked(prisma.uploadedFile.updateMany).mockImplementation((async ({
      where,
      data,
    }: {
      where: Row;
      data: Row;
    }) => {
      if (!matchesWhere(row, where)) return { count: 0 };
      row = { ...row, ...data, updatedAt: new Date() };
      return { count: 1 };
    }) as never);

    vi.mocked(checkClamAvHealth).mockResolvedValue(CLAMAV_UP as never);
    vi.mocked(scanStream).mockResolvedValue(CLEAN_SCAN as never);
    vi.mocked(scanBuffer).mockResolvedValue(CLEAN_SCAN as never);
  });

  it('releases the file when ClamAV is unreachable, so the retry can pick it up', async () => {
    vi.mocked(checkClamAvHealth).mockResolvedValue(CLAMAV_DOWN as never);

    await expect(runJob()).rejects.toThrow(/ClamAV is not reachable/);

    expect(row.status).toBe('PENDING');
    expect(row.scanStatus).toBe('PENDING');
    expect(row.processingError).toMatch(/ClamAV is not reachable/);
  });

  it('marks the file CLEAN once ClamAV is back, without any manual intervention', async () => {
    vi.mocked(checkClamAvHealth).mockResolvedValue(CLAMAV_DOWN as never);
    await expect(runJob()).rejects.toThrow(/ClamAV is not reachable/);

    vi.mocked(checkClamAvHealth).mockResolvedValue(CLAMAV_UP as never);
    await runJob();

    expect(row.status).toBe('COMPLETED');
    expect(row.scanStatus).toBe('CLEAN');
    expect(row.processingError).toBeNull();
  });

  it('recovers a PDF the same way', async () => {
    vi.mocked(checkClamAvHealth).mockResolvedValue(CLAMAV_DOWN as never);
    await expect(runJob('application/pdf')).rejects.toThrow(/ClamAV is not reachable/);
    expect(row.status).toBe('PENDING');

    vi.mocked(checkClamAvHealth).mockResolvedValue(CLAMAV_UP as never);
    await runJob('application/pdf');

    expect(row.status).toBe('COMPLETED');
    expect(row.scanStatus).toBe('CLEAN');
    expect(row.sanitizeStatus).toBe('COMPLETED');
  });

  it('does not count a transient failure as a definitive processing error', async () => {
    vi.mocked(checkClamAvHealth).mockResolvedValue(CLAMAV_DOWN as never);

    await expect(runJob()).rejects.toThrow(/ClamAV is not reachable/);

    expect(recordFileProcessing).toHaveBeenCalledWith('RETRY', 'RETRY', 'other', expect.any(Number));
  });

  it('writes a consistent FAILED state on an unexpected error, still eligible for a later retry', async () => {
    vi.mocked(scanStream).mockRejectedValue(new Error('boom'));

    await runJob();

    expect(row.status).toBe('FAILED');
    expect(row.scanStatus).toBe('ERROR');

    vi.mocked(scanStream).mockResolvedValue(CLEAN_SCAN as never);
    await runJob();

    expect(row.status).toBe('COMPLETED');
    expect(row.scanStatus).toBe('CLEAN');
  });

  it('never leaves the file in the unreachable FAILED + SCANNING state', async () => {
    vi.mocked(checkClamAvHealth).mockRejectedValue(new Error('unexpected clamav crash'));

    await expect(runJob()).rejects.toThrow('unexpected clamav crash');

    expect(row).not.toMatchObject({ status: 'FAILED', scanStatus: 'SCANNING' });
  });

  it('marks an infected file FAILED with the detected virus', async () => {
    vi.mocked(scanStream).mockResolvedValue(INFECTED_SCAN as never);

    await runJob();

    expect(row).toMatchObject({
      status: 'FAILED',
      scanStatus: 'INFECTED',
      sanitizeStatus: 'SKIPPED',
      processingError: 'Virus detected: Eicar-Test-Signature',
    });
    expect(recordFileProcessing).toHaveBeenCalledWith('INFECTED', 'SKIPPED', 'other', expect.any(Number));
  });

  it('never sanitizes nor stores an infected PDF', async () => {
    vi.mocked(scanBuffer).mockResolvedValue(INFECTED_SCAN as never);

    await runJob('application/pdf');

    expect(row).toMatchObject({ status: 'FAILED', scanStatus: 'INFECTED', safeFilePath: null });
    expect(sanitizePdf).not.toHaveBeenCalled();
    expect(uploadFileToMinio).not.toHaveBeenCalled();
  });

  it('stores the sanitized copy of a clean PDF and records its path and encryption', async () => {
    await runJob('application/pdf');

    expect(uploadFileToMinio).toHaveBeenCalledWith(
      Buffer.from('sanitized'),
      'safe_test.txt',
      'application/pdf',
      Buffer.from('sanitized').length,
    );
    expect(row).toMatchObject({
      status: 'COMPLETED',
      scanStatus: 'CLEAN',
      sanitizeStatus: 'COMPLETED',
      safeFilePath: 'safe/path.pdf',
      metadata: { encryptionSafe: { iv: 'iv', authTag: 'tag' } },
    });
  });

  it('keeps the original PDF available when storing the sanitized copy in MinIO fails', async () => {
    vi.mocked(uploadFileToMinio).mockRejectedValueOnce(new Error('Retryable HTTP status: 503'));

    await runJob('application/pdf');

    expect(row).toMatchObject({
      status: 'COMPLETED',
      scanStatus: 'CLEAN',
      sanitizeStatus: 'ERROR',
      safeFilePath: null,
      processingError: 'Retryable HTTP status: 503',
    });
  });

  it('marks the PDF FAILED when it cannot be downloaded from MinIO', async () => {
    vi.mocked(getFileBuffer).mockRejectedValueOnce(new Error('NoSuchKey'));

    await runJob('application/pdf');

    expect(row).toMatchObject({
      status: 'FAILED',
      scanStatus: 'ERROR',
      sanitizeStatus: 'ERROR',
      processingError: 'Failed to download file from storage',
    });
    expect(scanBuffer).not.toHaveBeenCalled();
  });

  it('marks the file FAILED when ClamAV rejects the scan for a non transient reason', async () => {
    vi.mocked(scanStream).mockResolvedValue({ success: false, error: 'File too large', errorReason: 'other' } as never);

    await runJob();

    expect(row).toMatchObject({ status: 'FAILED', scanStatus: 'ERROR', processingError: 'File too large' });
  });

  it('releases the file for a retry when the scan times out', async () => {
    vi.mocked(scanStream).mockResolvedValue({ success: false, error: 'Scan timeout', errorReason: 'timeout' } as never);

    await expect(runJob()).rejects.toThrow('Scan timeout');

    expect(row).toMatchObject({ status: 'PENDING', scanStatus: 'PENDING', processingError: 'Scan timeout' });
  });

  it('completes the file without scan when ClamAV is not configured', async () => {
    const clamavHost = envVars.CLAMAV_HOST;
    Object.assign(envVars, { CLAMAV_HOST: '' });

    try {
      await runJob();
    } finally {
      Object.assign(envVars, { CLAMAV_HOST: clamavHost });
    }

    expect(row).toMatchObject({ status: 'COMPLETED', scanStatus: 'SKIPPED', sanitizeStatus: 'SKIPPED' });
    expect(scanStream).not.toHaveBeenCalled();
  });

  it('does nothing when the file no longer exists', async () => {
    vi.mocked(prisma.uploadedFile.findUnique).mockResolvedValueOnce(null);

    await runJob();

    expect(prisma.uploadedFile.update).not.toHaveBeenCalled();
    expect(scanStream).not.toHaveBeenCalled();
  });

  it('leaves a file already being processed by another worker untouched', async () => {
    row = { ...row, status: 'PROCESSING', scanStatus: 'SCANNING', updatedAt: new Date() };

    await runJob();

    expect(row).toMatchObject({ status: 'PROCESSING', scanStatus: 'SCANNING' });
    expect(scanStream).not.toHaveBeenCalled();
  });
});
