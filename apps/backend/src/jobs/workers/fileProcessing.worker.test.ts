import { Readable } from 'node:stream';
import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordFileProcessing } from '../../features/monitoring/metrics.worker.js';
import { checkClamAvHealth, scanBuffer, scanStream } from '../../libs/clamav.js';
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

  it('rethrows an unexpected failure untouched, keeping the retry budget', async () => {
    class ClamAvCrash extends Error {}
    const crash = new ClamAvCrash('unexpected clamav crash');
    vi.mocked(checkClamAvHealth).mockRejectedValue(crash);

    await expect(runJob()).rejects.toBe(crash);

    expect(row.status).toBe('FAILED');
  });

  it('releases the file for a retry when the object storage is unavailable', async () => {
    // Message captured in production during the 2026-10-07 incident.
    vi.mocked(checkClamAvHealth).mockRejectedValue(
      new Error('Request failed after 1 retries: Error: Retryable HTTP status: 500'),
    );

    await expect(runJob()).rejects.toThrow('Retryable HTTP status: 500');

    expect(row.status).toBe('PENDING');
    expect(row.scanStatus).toBe('PENDING');
  });

  // A Postgres blip is not in the transient set, yet must not lose its retries the way the
  // blanket UnrecoverableError did.
  it('keeps the retry budget for a database failure', async () => {
    const dbError = Object.assign(new Error("Can't reach database server"), { code: 'P1001' });
    vi.mocked(checkClamAvHealth).mockRejectedValue(dbError);

    await expect(runJob()).rejects.toBe(dbError);
  });
});
