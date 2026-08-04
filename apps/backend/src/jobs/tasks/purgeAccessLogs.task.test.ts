import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countAccessLogs,
  countAccessLogsOlderThan,
  deleteAccessLogsOlderThan,
  getOldestAccessLogDate,
} from '../../features/accessLog/accessLog.service.js';
import { recordAccessLogPurge } from '../../features/monitoring/metrics.worker.js';
import { withCronLifecycle } from '../config/job.utils.js';
import { purgeAccessLogs } from './purgeAccessLogs.task.js';

const loggerMock = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../config/job.utils.js', () => ({
  withCronLifecycle: vi.fn(),
}));

vi.mock('../../features/accessLog/accessLog.service.js', () => ({
  countAccessLogs: vi.fn(),
  countAccessLogsOlderThan: vi.fn(),
  deleteAccessLogsOlderThan: vi.fn(),
  getOldestAccessLogDate: vi.fn(),
}));

vi.mock('../../features/monitoring/metrics.worker.js', () => ({
  recordAccessLogPurge: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => loggerMock,
}));

describe('purgeAccessLogs.task.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(countAccessLogsOlderThan).mockResolvedValue(0);
    vi.mocked(countAccessLogs).mockResolvedValue(0);
    vi.mocked(deleteAccessLogsOlderThan).mockResolvedValue(0);
    vi.mocked(getOldestAccessLogDate).mockResolvedValue(null);
  });

  const createMockJob = (retentionDays: number) =>
    ({
      name: 'purge-access-logs',
      id: 'job-123',
      data: { retentionDays },
    }) as unknown as Job<{ retentionDays: number }>;

  const runLifecycle = () =>
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => await fn({} as Job));

  it('should delete access logs older than the retention period', async () => {
    vi.mocked(deleteAccessLogsOlderThan).mockResolvedValueOnce(42);
    runLifecycle();

    const before = Date.now();
    await purgeAccessLogs(createMockJob(365));
    const after = Date.now();

    expect(deleteAccessLogsOlderThan).toHaveBeenCalledTimes(1);
    const [cutoff] = vi.mocked(deleteAccessLogsOlderThan).mock.calls[0];
    const retentionMs = 365 * 24 * 60 * 60 * 1000;

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - retentionMs);
    expect(cutoff.getTime()).toBeLessThanOrEqual(after - retentionMs);
    expect(countAccessLogsOlderThan).toHaveBeenCalledWith(cutoff);
  });

  it('should return the purge summary', async () => {
    vi.mocked(countAccessLogsOlderThan).mockResolvedValueOnce(7);
    vi.mocked(deleteAccessLogsOlderThan).mockResolvedValueOnce(7);
    vi.mocked(countAccessLogs).mockResolvedValueOnce(120);
    const oldest = new Date('2026-07-01T00:00:00.000Z');
    vi.mocked(getOldestAccessLogDate).mockResolvedValueOnce(oldest);

    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => {
      const result = await fn({} as Job);
      expect(result).toEqual({
        deletedCount: 7,
        expiredCount: 7,
        remainingCount: 120,
        deleteDurationSeconds: expect.any(Number),
        cutoff: expect.any(String),
        oldestCreatedAt: oldest.toISOString(),
      });
      return result;
    });

    await purgeAccessLogs(createMockJob(365));

    expect(withCronLifecycle).toHaveBeenCalledWith(expect.anything(), { retentionDays: 365 }, expect.any(Function));
  });

  it('should record purge metrics', async () => {
    vi.mocked(deleteAccessLogsOlderThan).mockResolvedValueOnce(7);
    vi.mocked(countAccessLogs).mockResolvedValueOnce(120);
    const oldest = new Date('2026-07-01T00:00:00.000Z');
    vi.mocked(getOldestAccessLogDate).mockResolvedValueOnce(oldest);
    runLifecycle();

    await purgeAccessLogs(createMockJob(365));

    expect(recordAccessLogPurge).toHaveBeenCalledWith({
      remainingCount: 120,
      oldestCreatedAt: oldest,
    });
  });

  it('should warn when entries older than the cutoff remain', async () => {
    vi.mocked(deleteAccessLogsOlderThan).mockResolvedValueOnce(1);
    vi.mocked(getOldestAccessLogDate).mockResolvedValueOnce(new Date('2000-01-01T00:00:00.000Z'));
    runLifecycle();

    await purgeAccessLogs(createMockJob(365));

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ oldestCreatedAt: '2000-01-01T00:00:00.000Z' }),
      'Access log purge: entries older than the retention period remain',
    );
  });

  it('should not warn when the remaining entries are within the retention period', async () => {
    vi.mocked(getOldestAccessLogDate).mockResolvedValueOnce(new Date());
    runLifecycle();

    await purgeAccessLogs(createMockJob(365));

    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('should refuse to purge when retentionDays is invalid', async () => {
    runLifecycle();

    await expect(purgeAccessLogs(createMockJob(0))).rejects.toThrow(/invalid retentionDays/);
    expect(deleteAccessLogsOlderThan).not.toHaveBeenCalled();
    expect(recordAccessLogPurge).not.toHaveBeenCalled();
  });
});
