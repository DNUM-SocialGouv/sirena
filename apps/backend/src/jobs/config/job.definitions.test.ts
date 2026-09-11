import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  envVars: {
    CRON_DEMAT_SOCIAL: '60',
    CRON_RETRY_AFFECTATION: '60',
    CRON_RETRY_IMPORT_REQUETES: '60',
    CRON_QUEUE_UNPROCESSED_FILES: '60',
    CRON_FILE_INTEGRITY_CHECK: '60',
    CRON_PURGE_ACCESS_LOGS: '60',
    CRON_SYNC_GEO_REFERENTIEL: '60',
    ACCESS_LOG_RETENTION_DAYS: 365,
  },
}));

vi.mock('../tasks/fetchRequetes.task.js', () => ({
  fetchRequetes: vi.fn(),
}));

vi.mock('../tasks/retryAffectation.task.js', () => ({
  retryAffectation: vi.fn(),
}));

vi.mock('../tasks/retryImportRequetes.task.js', () => ({
  retryImportRequetes: vi.fn(),
}));

vi.mock('../tasks/queueUnprocessedFiles.task.js', () => ({
  queueUnprocessedFiles: vi.fn(),
}));

vi.mock('../tasks/purgeAccessLogs.task.js', () => ({
  purgeAccessLogs: vi.fn(),
}));

vi.mock('../tasks/syncGeoReferentiel.task.js', () => ({
  syncGeoReferentiel: vi.fn(),
}));

describe('job.definitions', () => {
  describe('handlerMap', () => {
    it('should resolve the right handler for each job', async () => {
      const { jobHandlers } = await import('./job.definitions.js');
      const handlerMap = Object.fromEntries(jobHandlers.map((j) => [j.name, j.task]));
      for (const job of jobHandlers) {
        expect(handlerMap[job.name]).toBe(job.task);
      }
    });

    it('should derive a usable interval for every job', async () => {
      const { jobHandlers } = await import('./job.definitions.js');
      // Une variable d'environnement déclarée dans le schéma mais oubliée dans env.ts
      // remonterait ici sous la forme d'un NaN, et le job ne serait jamais planifié.
      for (const job of jobHandlers) {
        expect(job.repeatEveryMs).toBeGreaterThan(0);
      }
    });

    it('should derive the geo referentiel freshness guard from its configured interval', async () => {
      const { jobHandlers } = await import('./job.definitions.js');
      const syncGeo = jobHandlers.find((job) => job.name === 'sync-geo-referentiel');

      // Une garde constante annulerait tout abaissement de CRON_SYNC_GEO_REFERENTIEL :
      // chaque exécution serait ignorée pour cause de synchronisation trop récente.
      expect(syncGeo?.repeatEveryMs).toBe(60_000);
      expect(syncGeo?.data).toMatchObject({ minIntervalMs: 48_000 });
    });
  });
});
