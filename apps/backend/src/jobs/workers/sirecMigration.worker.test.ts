import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initAffectationTransco } from '../../features/sirecMigration/transco/affectation/affectation.transco.js';
import { createSirecMigrationWorker, TRANSCO_INIT_RETRY_DELAY_MS } from './sirecMigration.worker.js';

const mockWorker = vi.hoisted(() => ({
  on: vi.fn(),
  run: vi.fn(async () => {}),
  closing: undefined as Promise<void> | undefined,
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn(function MockWorker() {
    return mockWorker;
  }),
  UnrecoverableError: class extends Error {},
}));

vi.mock('../../config/redis.js', () => ({
  connection: {},
}));

vi.mock('../queues/sirecMigration.queue.js', () => ({
  SIREC_MIGRATION_QUEUE_NAME: 'sirec-migration',
}));

vi.mock('../../features/sirecMigration/transco/affectation/affectation.transco.js', () => ({
  initAffectationTransco: vi.fn(),
  ensureAffectationEntries: vi.fn(),
}));

vi.mock('../../features/sirecMigration/sirecMigration.files.service.js', () => ({ migrateSirecFiles: vi.fn() }));
vi.mock('../../features/sirecMigration/sirecMigration.repository.js', () => ({ fetchSirecData: vi.fn() }));
vi.mock('../../features/sirecMigration/sirecMigration.service.js', () => ({
  deleteRequeteWithRelatedData: vi.fn(),
  getRequeteIdFromSirecId: vi.fn(),
  saveFromSirec: vi.fn(),
}));

vi.mock('../../helpers/pino.js', () => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  return { createDefaultLogger: () => ({ ...logger, child: () => logger }) };
});

describe('createSirecMigrationWorker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(initAffectationTransco).mockReset();
    mockWorker.run.mockClear();
    mockWorker.closing = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create the worker with autorun disabled', async () => {
    const { Worker } = await import('bullmq');
    vi.mocked(initAffectationTransco).mockResolvedValue();

    createSirecMigrationWorker();

    expect(Worker).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function),
      expect.objectContaining({ autorun: false }),
    );
  });

  it('should start the worker once the affectation transco is initialized', async () => {
    vi.mocked(initAffectationTransco).mockResolvedValue();

    createSirecMigrationWorker();
    await vi.advanceTimersByTimeAsync(0);

    expect(initAffectationTransco).toHaveBeenCalledTimes(1);
    expect(mockWorker.run).toHaveBeenCalledTimes(1);
  });

  it('should retry the transco initialization after a failure, then start the worker', async () => {
    vi.mocked(initAffectationTransco).mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce();

    createSirecMigrationWorker();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockWorker.run).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(TRANSCO_INIT_RETRY_DELAY_MS);

    expect(initAffectationTransco).toHaveBeenCalledTimes(2);
    expect(mockWorker.run).toHaveBeenCalledTimes(1);
  });

  it('should stop retrying and not start the worker once it is closing', async () => {
    vi.mocked(initAffectationTransco).mockRejectedValue(new Error('db down'));

    createSirecMigrationWorker();
    await vi.advanceTimersByTimeAsync(0);
    mockWorker.closing = Promise.resolve();
    await vi.advanceTimersByTimeAsync(TRANSCO_INIT_RETRY_DELAY_MS * 3);

    expect(initAffectationTransco).toHaveBeenCalledTimes(1);
    expect(mockWorker.run).not.toHaveBeenCalled();
  });
});
