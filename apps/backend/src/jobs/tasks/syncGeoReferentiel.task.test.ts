import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLastCron } from '../../crons/crons.service.js';
import { syncGeoReferentiel as runSync } from '../../features/geoReferentiel/geoReferentiel.service.js';
import type { JobDataMap } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';
import { syncGeoReferentiel } from './syncGeoReferentiel.task.js';

const loggerMock = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };

vi.mock('../config/job.utils.js', () => ({ withCronLifecycle: vi.fn() }));
vi.mock('../../crons/crons.service.js', () => ({ getLastCron: vi.fn() }));
vi.mock('../../features/geoReferentiel/geoReferentiel.service.js', () => ({ syncGeoReferentiel: vi.fn() }));
vi.mock('../../libs/asyncLocalStorage.js', () => ({ getLoggerStore: () => loggerMock }));

const job = {
  name: 'sync-geo-referentiel',
  data: { timeoutMs: 1_000, minIntervalDays: 25 },
} as Job<JobDataMap['sync-geo-referentiel']>;

const syncResult = {
  skipped: false,
  communes: { created: 1, updated: 0, deleted: 0 },
  inseePostal: { created: 2, updated: 0, deleted: 0 },
  orphanCommunes: 0,
  duplicateRows: 0,
  orphanPostalRows: 0,
  deletionsSkipped: false,
  coverage: { territoiresCount: 111, missingCdCount: 0, missingDdCount: 0, missing: [] },
};

/** Exécute le corps confié à withCronLifecycle et renvoie ce qu'il produit. */
const runTask = async () => {
  let captured: unknown;
  vi.mocked(withCronLifecycle).mockImplementation(async (j, _params, fn) => {
    captured = await fn(j);
    // biome-ignore lint/suspicious/noExplicitAny: la valeur de retour n'est pas utilisée par la tâche
    return captured as any;
  });

  await syncGeoReferentiel(job);
  return captured;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getLastCron).mockResolvedValue(null);
  vi.mocked(runSync).mockResolvedValue(syncResult);
});

describe('syncGeoReferentiel.task', () => {
  it('should run the synchronisation when no previous run is recorded', async () => {
    const result = await runTask();

    expect(runSync).toHaveBeenCalledTimes(1);
    expect(result).toEqual(syncResult);
  });

  it('should register the cron lifecycle with its parameters', async () => {
    await runTask();

    expect(withCronLifecycle).toHaveBeenCalledWith(
      job,
      { timeoutMs: 1_000, minIntervalDays: 25 },
      expect.any(Function),
    );
  });

  it('should skip a run that would repeat a recent synchronisation', async () => {
    const endedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    // biome-ignore lint/suspicious/noExplicitAny: seul endedAt est lu par la tâche
    vi.mocked(getLastCron).mockResolvedValue({ endedAt } as any);

    const result = await runTask();

    expect(runSync).not.toHaveBeenCalled();
    expect(result).toMatchObject({ skipped: true });
  });

  it('should run again once the minimum interval has elapsed', async () => {
    const endedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // biome-ignore lint/suspicious/noExplicitAny: seul endedAt est lu par la tâche
    vi.mocked(getLastCron).mockResolvedValue({ endedAt } as any);

    await runTask();

    expect(runSync).toHaveBeenCalledTimes(1);
  });

  it('should run when the last recorded cron never ended', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: cas d'un cron interrompu avant sa fin
    vi.mocked(getLastCron).mockResolvedValue({ endedAt: null } as any);

    await runTask();

    expect(runSync).toHaveBeenCalledTimes(1);
  });

  it('should pass an abort signal to the synchronisation', async () => {
    await runTask();

    const [options] = vi.mocked(runSync).mock.calls[0];
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(options?.signal?.aborted).toBe(false);
  });

  it('should abort the synchronisation once the timeout elapses', async () => {
    vi.useFakeTimers();
    vi.mocked(runSync).mockImplementation(async ({ signal } = {}) => {
      vi.advanceTimersByTime(1_500);
      expect(signal?.aborted).toBe(true);
      return syncResult;
    });

    await runTask();

    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('aborted'));
    vi.useRealTimers();
  });

  it('should propagate a synchronisation failure', async () => {
    vi.mocked(runSync).mockRejectedValue(new Error('source indisponible'));
    vi.mocked(withCronLifecycle).mockImplementation(async (j, _params, fn) => fn(j));

    await expect(syncGeoReferentiel(job)).rejects.toThrow('source indisponible');
  });
});
