import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';

const { handlers } = vi.hoisted(() => ({
  handlers: { 'fetch-requetes': vi.fn(), 'purge-access-logs': vi.fn() },
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn(function MockWorker() {
    return { on: vi.fn() };
  }),
}));

vi.mock('../../config/redis.js', () => ({ connection: {} }));
vi.mock('../config/job.queues.js', () => ({ cronQueue: { name: 'cron-queue' } }));
vi.mock('../config/job.definitions.js', () => ({
  jobHandlers: Object.entries(handlers).map(([name, task]) => ({ name, task })),
}));

const { cronWorker } = await import('./cron.worker.js');

type Processor = (job: Job) => Promise<unknown>;
const processor = vi.mocked(Worker).mock.calls[0][1] as Processor;

const job = (name: string) => ({ name, id: 'job-1', attemptsMade: 0 }) as Job;

describe('cron.worker.ts', () => {
  beforeEach(() => {
    handlers['fetch-requetes'].mockReset();
    handlers['purge-access-logs'].mockReset();
  });

  it('listens on the cron queue', () => {
    expect(cronWorker).toBeDefined();
    expect(Worker).toHaveBeenCalledWith(
      'cron-queue',
      expect.any(Function),
      expect.objectContaining({ concurrency: 5 }),
    );
  });

  it('runs only the handler matching the job name, with a job logger available', async () => {
    let hasLogger = false;
    handlers['purge-access-logs'].mockImplementation(async () => {
      hasLogger = Boolean(getLoggerStore());
      return { purged: 3 };
    });

    await expect(processor(job('purge-access-logs'))).resolves.toEqual({ purged: 3 });

    expect(handlers['purge-access-logs']).toHaveBeenCalledWith(job('purge-access-logs'));
    expect(handlers['fetch-requetes']).not.toHaveBeenCalled();
    expect(hasLogger).toBe(true);
  });

  it('fails a job that has no handler', async () => {
    await expect(processor(job('unknown-job'))).rejects.toThrow('No handler for job: unknown-job');
  });
});
