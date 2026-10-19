import { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addSirecIdsToQueue, SIREC_MIGRATION_QUEUE_NAME } from './sirecMigration.queue.js';

const { addBulk } = vi.hoisted(() => ({ addBulk: vi.fn() }));

vi.mock('../../config/redis.js', () => ({ connection: {} }));

vi.mock('bullmq', () => ({
  Queue: vi.fn(function MockQueue() {
    return { addBulk };
  }),
}));

// Captured at load time: Vitest 5 clears mock calls before each test (`clearMocks` defaults to true).
const queueArgs = vi.mocked(Queue).mock.calls[0];

describe('sirecMigration.queue.ts', () => {
  beforeEach(() => {
    addBulk.mockClear();
  });

  it('retries a failing migration a bounded number of times', () => {
    expect(queueArgs).toEqual([
      SIREC_MIGRATION_QUEUE_NAME,
      expect.objectContaining({
        defaultJobOptions: expect.objectContaining({ attempts: 3, backoff: { type: 'fixed', delay: 5000 } }),
      }),
    ]);
  });

  it('queues one migration job per SIREC id with the requested options', async () => {
    await expect(addSirecIdsToQueue([12, 34], true, false, 'mock.pdf')).resolves.toBe(2);

    expect(addBulk).toHaveBeenCalledWith([
      { name: 'migrate', data: { sirecId: 12, deleteIfExists: true, migrateFiles: false, mockFilePath: 'mock.pdf' } },
      { name: 'migrate', data: { sirecId: 34, deleteIfExists: true, migrateFiles: false, mockFilePath: 'mock.pdf' } },
    ]);
  });

  it('keeps existing requetes and migrates the files by default', async () => {
    await addSirecIdsToQueue([12]);

    expect(addBulk).toHaveBeenCalledWith([
      { name: 'migrate', data: { sirecId: 12, deleteIfExists: false, migrateFiles: true, mockFilePath: undefined } },
    ]);
  });

  it('queues nothing for an empty list', async () => {
    await expect(addSirecIdsToQueue([])).resolves.toBe(0);

    expect(addBulk).not.toHaveBeenCalled();
  });
});
