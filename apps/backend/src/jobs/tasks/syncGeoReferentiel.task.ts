import type { Job } from 'bullmq';
import { getLastCron } from '../../crons/crons.service.js';
import { syncGeoReferentiel as runSync } from '../../features/geoReferentiel/geoReferentiel.service.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function syncGeoReferentiel(job: Job<JobDataMap['sync-geo-referentiel']>): JobResult {
  const logger = getLoggerStore();

  await withCronLifecycle(
    job,
    { timeoutMs: job.data.timeoutMs, minIntervalDays: job.data.minIntervalDays },
    async (j) => {
      // Le planificateur réenregistre les jobs à chaque démarrage : sans cette garde, un
      // redéploiement relancerait une synchronisation qui vient d'avoir lieu.
      const lastRun = await getLastCron(job.name);
      const daysSinceLastRun = lastRun?.endedAt ? (Date.now() - lastRun.endedAt.getTime()) / DAY_IN_MS : null;

      if (daysSinceLastRun !== null && daysSinceLastRun < j.data.minIntervalDays) {
        logger.info(
          { daysSinceLastRun, minIntervalDays: j.data.minIntervalDays },
          'Référentiel géographique déjà synchronisé récemment, exécution ignorée',
        );
        return { skipped: true, daysSinceLastRun };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        logger.warn(`Job ${job.name} aborted after ${j.data.timeoutMs}ms`);
        controller.abort();
      }, j.data.timeoutMs);

      try {
        return await runSync({ signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    },
  );
}
