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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const job = {
  name: 'sync-geo-referentiel',
  data: { timeoutMs: 1_000, minIntervalMs: 24 * DAY_IN_MS },
} as Job<JobDataMap['sync-geo-referentiel']>;

const syncResult = {
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

const givenLastRun = (endedAt: Date | null) => {
  // biome-ignore lint/suspicious/noExplicitAny: seul endedAt est lu par la tâche
  vi.mocked(getLastCron).mockResolvedValue({ endedAt } as any);
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
      { timeoutMs: 1_000, minIntervalMs: 24 * DAY_IN_MS },
      expect.any(Function),
    );
  });

  it('should skip a run that would repeat a recent synchronisation', async () => {
    givenLastRun(new Date(Date.now() - 3 * DAY_IN_MS));

    await runTask();

    expect(runSync).not.toHaveBeenCalled();
  });

  it('should not record a skipped run as a synchronisation', async () => {
    // Sinon la garde repousserait sa propre échéance à chaque redéploiement et le
    // référentiel ne serait plus jamais synchronisé.
    givenLastRun(new Date(Date.now() - 3 * DAY_IN_MS));

    await runTask();

    expect(withCronLifecycle).not.toHaveBeenCalled();
  });

  it('should run again once the minimum interval has elapsed', async () => {
    givenLastRun(new Date(Date.now() - 30 * DAY_IN_MS));

    await runTask();

    expect(runSync).toHaveBeenCalledTimes(1);
  });

  it('should run when the last recorded cron never ended', async () => {
    givenLastRun(null);

    await runTask();

    expect(runSync).toHaveBeenCalledTimes(1);
  });

  it('should read the last run before opening its own cron lifecycle', async () => {
    await runTask();

    expect(vi.mocked(getLastCron).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(withCronLifecycle).mock.invocationCallOrder[0],
    );
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
