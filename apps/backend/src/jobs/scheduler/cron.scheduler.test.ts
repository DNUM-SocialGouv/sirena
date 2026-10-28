import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jobHandlers } from '../config/job.definitions.js';
import { SCHEDULER_LOCK_KEY, SCHEDULER_LOCK_TTL_SECONDS, startScheduler } from './cron.scheduler.js';

// In-memory stand-ins for Redis and the BullMQ queue, following their semantics: SET only refuses
// an existing key with NX, getJobs only returns the jobs in the requested states, and
// upsertJobScheduler replaces the scheduler with the same id.
const { store, cronQueue, connection } = vi.hoisted(() => {
  type QueuedJob = { name: string; data: unknown; state: string; remove: () => Promise<void> };
  const store = {
    locks: new Map<string, string>(),
    schedulers: new Map<string, { key: string; name: string; every: number; template: unknown }>(),
    jobs: [] as QueuedJob[],
  };

  const cronQueue = {
    getJobSchedulers: vi.fn(async () => [...store.schedulers.values()]),
    removeJobScheduler: vi.fn(async (key: string) => store.schedulers.delete(key)),
    upsertJobScheduler: vi.fn(async (id: string, repeat: { every: number }, template: unknown) => {
      store.schedulers.set(id, { key: id, name: id, every: repeat.every, template });
    }),
    getJobs: vi.fn(async (states: string[]) => store.jobs.filter((job) => states.includes(job.state))),
    add: vi.fn(async (name: string, data: unknown) => {
      const job: QueuedJob = {
        name,
        data,
        state: 'waiting',
        remove: vi.fn(async () => {
          const index = store.jobs.indexOf(job);
          if (index !== -1) store.jobs.splice(index, 1);
        }),
      };
      store.jobs.push(job);
      return job;
    }),
  };

  const connection = {
    set: vi.fn(async (key: string, value: string, ...options: unknown[]) => {
      if (options.includes('NX') && store.locks.has(key)) return null;
      store.locks.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (key: string) => (store.locks.delete(key) ? 1 : 0)),
  };

  return { store, cronQueue, connection };
});

vi.mock('../../config/redis.js', () => ({ connection }));
vi.mock('../config/job.queues.js', () => ({ cronQueue }));

vi.mock('../tasks/fetchRequetes.task.js', () => ({ fetchRequetes: vi.fn() }));
vi.mock('../tasks/retryAffectation.task.js', () => ({ retryAffectation: vi.fn() }));
vi.mock('../tasks/retryImportRequetes.task.js', () => ({ retryImportRequetes: vi.fn() }));
vi.mock('../tasks/queueUnprocessedFiles.task.js', () => ({ queueUnprocessedFiles: vi.fn() }));
vi.mock('../tasks/fileIntegrityCheck.task.js', () => ({ fileIntegrityCheck: vi.fn() }));
vi.mock('../tasks/purgeAccessLogs.task.js', () => ({ purgeAccessLogs: vi.fn() }));
vi.mock('../tasks/purgeDocumentExports.task.js', () => ({ purgeDocumentExports: vi.fn() }));

const runOnStartNames = jobHandlers.filter((j) => j.runOnStart).map((j) => j.name);

describe('cron.scheduler.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.locks.clear();
    store.schedulers.clear();
    store.jobs.length = 0;
  });

  it('registers every job declared in job.definitions with its interval and data', async () => {
    await startScheduler();

    expect([...store.schedulers.keys()].sort()).toEqual(jobHandlers.map((j) => j.name).sort());
    for (const { name, repeatEveryMs, data } of jobHandlers) {
      expect(store.schedulers.get(name)).toMatchObject({
        every: repeatEveryMs,
        template: { name, data, opts: { removeOnComplete: true } },
      });
    }
  });

  it('triggers an immediate run only for the jobs flagged runOnStart', async () => {
    await startScheduler();

    expect(store.jobs.map((j) => j.name).sort()).toEqual([...runOnStartNames].sort());
  });

  it('creates no duplicate scheduler nor immediate run on a second invocation', async () => {
    await startScheduler();
    await startScheduler();

    expect(store.schedulers.size).toBe(jobHandlers.length);
    expect(store.jobs.map((j) => j.name).sort()).toEqual([...runOnStartNames].sort());
  });

  it('removes the waiting jobs left by a previous deployment before rescheduling', async () => {
    const [{ name }] = jobHandlers;
    await cronQueue.add(name, { stale: true });

    await startScheduler();

    expect(store.jobs.find((j) => j.name === name && (j.data as { stale?: boolean }).stale)).toBeUndefined();
  });

  it('takes the lock with an expiry, so that a crashed instance cannot block scheduling for good', async () => {
    await startScheduler();

    expect(connection.set).toHaveBeenCalledWith(
      SCHEDULER_LOCK_KEY,
      expect.any(String),
      'EX',
      SCHEDULER_LOCK_TTL_SECONDS,
      'NX',
    );
  });

  it('schedules nothing when another instance holds the lock', async () => {
    store.locks.set(SCHEDULER_LOCK_KEY, 'other-pid');

    await startScheduler();

    expect(cronQueue.upsertJobScheduler).not.toHaveBeenCalled();
    expect(store.locks.get(SCHEDULER_LOCK_KEY)).toBe('other-pid');
  });

  it('releases the lock even when scheduling fails', async () => {
    cronQueue.upsertJobScheduler.mockRejectedValueOnce(new Error('redis down'));

    await expect(startScheduler()).rejects.toThrow('redis down');

    expect(store.locks.has(SCHEDULER_LOCK_KEY)).toBe(false);
  });
});
