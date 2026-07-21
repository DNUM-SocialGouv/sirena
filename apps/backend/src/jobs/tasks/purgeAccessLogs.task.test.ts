import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { withCronLifecycle } from '../config/job.utils.js';
import { purgeAccessLogs } from './purgeAccessLogs.task.js';

vi.mock('../config/job.utils.js', () => ({
  withCronLifecycle: vi.fn(),
}));

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    accessLog: {
      deleteMany: vi.fn(),
    },
  },
}));

describe('purgeAccessLogs.task.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockJob = (retentionDays: number) =>
    ({
      name: 'purge-access-logs',
      id: 'job-123',
      data: { retentionDays },
    }) as unknown as Job<{ retentionDays: number }>;

  it('should delete access logs older than the retention period', async () => {
    vi.mocked(prisma.accessLog.deleteMany).mockResolvedValueOnce({ count: 42 });
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => await fn({} as Job));

    const before = Date.now();
    await purgeAccessLogs(createMockJob(365));
    const after = Date.now();

    expect(prisma.accessLog.deleteMany).toHaveBeenCalledTimes(1);
    const [args] = vi.mocked(prisma.accessLog.deleteMany).mock.calls[0];
    if (!args?.where?.createdAt) throw new Error('deleteMany called without a createdAt filter');
    const cutoff = (args.where.createdAt as { lt: Date }).lt;
    const retentionMs = 365 * 24 * 60 * 60 * 1000;

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - retentionMs);
    expect(cutoff.getTime()).toBeLessThanOrEqual(after - retentionMs);
  });

  it('should return the deleted count and cutoff date', async () => {
    vi.mocked(prisma.accessLog.deleteMany).mockResolvedValueOnce({ count: 7 });
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => {
      const result = await fn({} as Job);
      expect(result).toEqual({
        deletedCount: 7,
        cutoff: expect.any(String),
      });
      return result;
    });

    await purgeAccessLogs(createMockJob(365));

    expect(withCronLifecycle).toHaveBeenCalledWith(expect.anything(), { retentionDays: 365 }, expect.any(Function));
  });

  it('should refuse to purge when retentionDays is invalid', async () => {
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => await fn({} as Job));

    await expect(purgeAccessLogs(createMockJob(0))).rejects.toThrow(/invalid retentionDays/);
    expect(prisma.accessLog.deleteMany).not.toHaveBeenCalled();
  });
});
