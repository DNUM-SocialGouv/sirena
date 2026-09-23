import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  envVars: {
    CRON_DEMAT_SOCIAL: '60',
    CRON_RETRY_AFFECTATION: '60',
    CRON_RETRY_IMPORT_REQUETES: '60',
    CRON_QUEUE_UNPROCESSED_FILES: '60',
    CRON_FILE_INTEGRITY_CHECK: '60',
    CRON_PURGE_ACCESS_LOGS: '60',
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

    it('should leave the geo referentiel synchronisation out of the internal scheduler', async () => {
      const { jobHandlers } = await import('./job.definitions.js');

      // Son rythme est mensuel, très au-delà de la durée de vie d'un déploiement, alors que
      // le planificateur recrée ses jobs répétables à chaque démarrage : le compte à rebours
      // repartirait de zéro à chaque mise en production et la synchronisation ne se
      // déclencherait jamais. Elle est portée par un CronJob Kubernetes, et ce test est là
      // pour que personne ne la ramène ici par inadvertance.
      expect(jobHandlers.map((job) => job.name)).not.toContain('sync-geo-referentiel');
    });
  });
});
