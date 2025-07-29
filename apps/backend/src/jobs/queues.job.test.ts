import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jobHandlers } from './definitions.job';
import { cronQueue } from './queues.job';
import { startScheduler } from './scheduler.job';

vi.mock('@/config/env', () => ({
  envVars: {},
}));

vi.mock('./queues.job', () => ({
  cronQueue: {
    getJobSchedulers: vi.fn(),
    removeJobScheduler: vi.fn(),
    add: vi.fn(),
  },
}));

describe('queues.job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('startScheduler', () => {
    it('should remove existing jobs and schedule new ones', async () => {
      const existingJobs = jobHandlers.map(({ name }) => ({
        name,
        key: `${name}::repeat`,
      }));

      vi.mocked(cronQueue.getJobSchedulers).mockResolvedValue(existingJobs);

      await startScheduler();

      for (const { name, repeatEveryMs } of jobHandlers) {
        expect(cronQueue.removeJobScheduler).toHaveBeenCalledWith(`${name}::repeat`);
        expect(cronQueue.add).toHaveBeenCalledWith(
          name,
          { timeoutMs: 1000 * 60 * 5 },
          {
            repeat: { every: repeatEveryMs },
            removeOnComplete: true,
          },
        );
      }
    });

    it('should schedule job if not already present', async () => {
      vi.mocked(cronQueue.getJobSchedulers).mockResolvedValue([]);

      await startScheduler();

      expect(cronQueue.removeJobScheduler).not.toHaveBeenCalled();
      expect(cronQueue.add).toHaveBeenCalledTimes(jobHandlers.length);
    });
  });
});
