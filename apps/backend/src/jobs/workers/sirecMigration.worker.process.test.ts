import { type Job, UnrecoverableError, Worker } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type { SirecMigrationJobData } from '../queues/sirecMigration.queue.js';

// Shared across module reloads: each test loads a fresh worker module, whose transco cache is module state.
// The SIREC error classes are reloaded with it, so the tests build their errors from the reloaded module.
const mocks = vi.hoisted(() => ({
  fetchSirecData: vi.fn(),
  getRequeteIdFromSirecId: vi.fn(),
  deleteRequeteWithRelatedData: vi.fn(),
  saveFromSirec: vi.fn(),
  initAffectationTransco: vi.fn(),
  ensureAffectationEntries: vi.fn(),
  collectAffectationSirecIds: vi.fn(),
  transformSirecReclamation: vi.fn(),
  migrateSirecFiles: vi.fn(),
}));

vi.mock('bullmq', async (importOriginal) => ({
  ...(await importOriginal<typeof import('bullmq')>()),
  Worker: vi.fn(function MockWorker() {
    return { on: vi.fn(), run: vi.fn(async () => {}), closing: undefined };
  }),
}));

vi.mock('../../config/redis.js', () => ({ connection: {} }));
vi.mock('../queues/sirecMigration.queue.js', () => ({ SIREC_MIGRATION_QUEUE_NAME: 'sirec-ids-to-migrate' }));
vi.mock('../../features/sirecMigration/sirecMigration.repository.js', () => ({
  fetchSirecData: mocks.fetchSirecData,
}));
vi.mock('../../features/sirecMigration/sirecMigration.service.js', () => ({
  getRequeteIdFromSirecId: mocks.getRequeteIdFromSirecId,
  deleteRequeteWithRelatedData: mocks.deleteRequeteWithRelatedData,
  saveFromSirec: mocks.saveFromSirec,
}));
vi.mock('../../features/sirecMigration/transco/affectation/affectation.transco.js', () => ({
  initAffectationTransco: mocks.initAffectationTransco,
  ensureAffectationEntries: mocks.ensureAffectationEntries,
}));
vi.mock('../../features/sirecMigration/transformers/situation/sirecMigration.affectation.transformer.js', () => ({
  collectAffectationSirecIds: mocks.collectAffectationSirecIds,
}));
vi.mock('../../features/sirecMigration/transformers/sirecMigration.transformer.js', () => ({
  transformSirecReclamation: mocks.transformSirecReclamation,
}));
vi.mock('../../features/sirecMigration/sirecMigration.files.service.js', () => ({
  migrateSirecFiles: mocks.migrateSirecFiles,
}));

type Processor = (job: Job<SirecMigrationJobData>) => Promise<void>;
type SirecErrors = typeof import('../../features/sirecMigration/transco/sirecTransco.error.js');

const SIREC_ID = 42;
const transformed = { sirecId: SIREC_ID, requete: {} };
const saveResult = {
  requeteId: 'R1',
  etapeIdsByFileType: new Map([['courrier', ['etape-1']]]),
  etapeIdsByMainCouranteId: new Map([[7, ['etape-2']]]),
  faitSituationIds: ['situation-1'],
};

const job = (data: Partial<SirecMigrationJobData> = {}) =>
  ({ id: 'job-1', data: { sirecId: SIREC_ID, ...data } }) as Job<SirecMigrationJobData>;

describe('sirecMigration.worker.ts: job processing', () => {
  let processor: Processor;
  let sirecErrors: SirecErrors;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    sirecErrors = await import('../../features/sirecMigration/transco/sirecTransco.error.js');
    const { createSirecMigrationWorker } = await import('./sirecMigration.worker.js');
    createSirecMigrationWorker();
    processor = vi.mocked(Worker).mock.calls.at(-1)?.[1] as Processor;

    mocks.initAffectationTransco.mockResolvedValue(undefined);
    mocks.ensureAffectationEntries.mockResolvedValue(undefined);
    mocks.collectAffectationSirecIds.mockReturnValue([SIREC_ID]);
    mocks.fetchSirecData.mockResolvedValue({ id: SIREC_ID });
    mocks.getRequeteIdFromSirecId.mockResolvedValue(null);
    mocks.transformSirecReclamation.mockReturnValue(transformed);
    mocks.saveFromSirec.mockResolvedValue(saveResult);
  });

  it('saves the transformed SIREC record and migrates its files', async () => {
    await processor(job({ mockFilePath: 'mock.pdf' }));

    expect(mocks.transformSirecReclamation).toHaveBeenCalledWith({ id: SIREC_ID });
    expect(mocks.saveFromSirec).toHaveBeenCalledWith(transformed);
    expect(mocks.migrateSirecFiles).toHaveBeenCalledWith(
      SIREC_ID,
      'R1',
      saveResult.etapeIdsByFileType,
      saveResult.etapeIdsByMainCouranteId,
      saveResult.faitSituationIds,
      'mock.pdf',
    );
  });

  it('loads the affectation entries of the record before transforming it', async () => {
    await processor(job());

    expect(mocks.collectAffectationSirecIds).toHaveBeenCalledWith({ id: SIREC_ID });
    expect(mocks.ensureAffectationEntries).toHaveBeenCalledWith([SIREC_ID]);
    expect(mocks.ensureAffectationEntries.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.transformSirecReclamation.mock.invocationCallOrder[0],
    );
  });

  it('does not migrate the files when migrateFiles is false', async () => {
    await processor(job({ migrateFiles: false }));

    expect(mocks.saveFromSirec).toHaveBeenCalled();
    expect(mocks.migrateSirecFiles).not.toHaveBeenCalled();
  });

  it('skips a record missing from SIREC', async () => {
    mocks.fetchSirecData.mockResolvedValue(null);

    await processor(job());

    expect(mocks.saveFromSirec).not.toHaveBeenCalled();
    expect(mocks.migrateSirecFiles).not.toHaveBeenCalled();
  });

  it('skips a record already migrated', async () => {
    mocks.getRequeteIdFromSirecId.mockResolvedValue('R0');

    await processor(job());

    expect(mocks.deleteRequeteWithRelatedData).not.toHaveBeenCalled();
    expect(mocks.saveFromSirec).not.toHaveBeenCalled();
  });

  it('deletes the existing requete before migrating the record again when asked to', async () => {
    mocks.getRequeteIdFromSirecId.mockResolvedValue('R0');

    await processor(job({ deleteIfExists: true }));

    expect(mocks.deleteRequeteWithRelatedData).toHaveBeenCalledWith('R0');
    expect(mocks.deleteRequeteWithRelatedData.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.saveFromSirec.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ['an unknown transco id', () => new sirecErrors.SirecTranscoError(99, 'motif')],
    ['invalid SIREC data', () => new sirecErrors.SirecDataError('Missing reception date')],
  ])('fails without retry on %s', async (_label, createError) => {
    const error = createError();
    mocks.transformSirecReclamation.mockImplementation(() => {
      throw error;
    });

    const run = processor(job());

    await expect(run).rejects.toBeInstanceOf(UnrecoverableError);
    await expect(run).rejects.toThrow(error.message);
    expect(mocks.saveFromSirec).not.toHaveBeenCalled();
  });

  it('lets an unexpected transform error be retried', async () => {
    const error = new Error('boom');
    mocks.transformSirecReclamation.mockImplementation(() => {
      throw error;
    });

    await expect(processor(job())).rejects.toBe(error);
  });

  it('skips a record failing schema validation without failing the job', async () => {
    mocks.saveFromSirec.mockRejectedValue(new ZodError([]));

    await expect(processor(job())).resolves.toBeUndefined();

    expect(mocks.migrateSirecFiles).not.toHaveBeenCalled();
  });

  it('lets a database failure while saving be retried', async () => {
    const error = new Error("Can't reach database server");
    mocks.saveFromSirec.mockRejectedValue(error);

    await expect(processor(job())).rejects.toBe(error);

    expect(mocks.migrateSirecFiles).not.toHaveBeenCalled();
  });
});
