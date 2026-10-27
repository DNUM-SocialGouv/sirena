import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findExpiredDocumentExportFiles,
  markDocumentExportsExpired,
} from '../../features/documentExports/documentExports.service.js';
import { deleteFilesFromMinio } from '../../libs/minio.js';
import { withCronLifecycle } from '../config/job.utils.js';
import { purgeDocumentExports } from './purgeDocumentExports.task.js';

const loggerMock = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../config/job.utils.js', () => ({
  withCronLifecycle: vi.fn(),
}));

vi.mock('../../features/documentExports/documentExports.service.js', () => ({
  findExpiredDocumentExportFiles: vi.fn(),
  markDocumentExportsExpired: vi.fn(),
}));

vi.mock('../../libs/minio.js', () => ({
  deleteFilesFromMinio: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => loggerMock,
}));

const job = { name: 'purge-document-exports', id: 'job-1', data: { batchSize: 500 } } as unknown as Job<{
  batchSize: number;
}>;

// Runs the task body and hands back what it returned to the cron lifecycle.
const runPurge = async () => {
  let result: unknown;
  vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => {
    result = await fn({} as Job);
    return result as Record<string, unknown>;
  });
  await purgeDocumentExports(job);
  return result;
};

const expiredExports = [
  { id: 'export-1', filePath: 'exports/one.csv' },
  { id: 'export-2', filePath: 'exports/two.csv' },
];

describe('purgeDocumentExports.task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findExpiredDocumentExportFiles).mockResolvedValue([]);
    vi.mocked(deleteFilesFromMinio).mockResolvedValue([]);
    vi.mocked(markDocumentExportsExpired).mockImplementation(async (ids) => ids.length);
  });

  it('deletes the expired files, then marks their exports expired', async () => {
    vi.mocked(findExpiredDocumentExportFiles).mockResolvedValueOnce(expiredExports);

    const before = Date.now();
    const result = await runPurge();

    const [now, limit] = vi.mocked(findExpiredDocumentExportFiles).mock.calls[0];
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(limit).toBe(500);
    expect(deleteFilesFromMinio).toHaveBeenCalledWith(['exports/one.csv', 'exports/two.csv']);
    expect(markDocumentExportsExpired).toHaveBeenCalledWith(['export-1', 'export-2']);
    expect(vi.mocked(deleteFilesFromMinio).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(markDocumentExportsExpired).mock.invocationCallOrder[0],
    );
    expect(result).toEqual({ expiredCount: 2, purgedCount: 2, failedCount: 0 });
  });

  it('keeps the export whose file could not be deleted, so the next run retries it', async () => {
    vi.mocked(findExpiredDocumentExportFiles).mockResolvedValueOnce(expiredExports);
    vi.mocked(deleteFilesFromMinio).mockResolvedValueOnce([{ key: 'exports/one.csv', message: 'AccessDenied' }]);

    const result = await runPurge();

    expect(markDocumentExportsExpired).toHaveBeenCalledWith(['export-2']);
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1 }),
      expect.stringContaining('retried on the next run'),
    );
    expect(result).toEqual({ expiredCount: 2, purgedCount: 1, failedCount: 1 });
  });

  it('marks nothing when the object storage is unreachable', async () => {
    vi.mocked(findExpiredDocumentExportFiles).mockResolvedValueOnce(expiredExports);
    vi.mocked(deleteFilesFromMinio).mockRejectedValueOnce(new Error('minio down'));

    await expect(runPurge()).rejects.toThrow('minio down');

    expect(markDocumentExportsExpired).not.toHaveBeenCalled();
  });

  it('does not call the object storage when no export has expired', async () => {
    const result = await runPurge();

    expect(deleteFilesFromMinio).not.toHaveBeenCalled();
    expect(markDocumentExportsExpired).not.toHaveBeenCalled();
    expect(result).toEqual({ expiredCount: 0, purgedCount: 0, failedCount: 0 });
  });
});
