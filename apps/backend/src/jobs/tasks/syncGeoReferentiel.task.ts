import type { Job } from 'bullmq';
import { getLastCron } from '../../crons/crons.service.js';
import { syncGeoReferentiel as runSync } from '../../features/geoReferentiel/geoReferentiel.service.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

export async function syncGeoReferentiel(job: Job<JobDataMap['sync-geo-referentiel']>): JobResult {
  const logger = getLoggerStore();
  const { timeoutMs, minIntervalMs } = job.data;

  // Le planificateur réenregistre les jobs à chaque démarrage : sans cette garde, un
  // redéploiement relancerait une synchronisation qui vient d'avoir lieu. Elle est évaluée
  // avant `withCronLifecycle`, car une exécution ignorée qui s'enregistrerait comme une
  // synchronisation réussie deviendrait la nouvelle référence de fraîcheur et repousserait
  // indéfiniment la suivante.
  const lastRun = await getLastCron(job.name);
  const msSinceLastRun = lastRun?.endedAt ? Date.now() - lastRun.endedAt.getTime() : null;

  if (msSinceLastRun !== null && msSinceLastRun < minIntervalMs) {
    logger.info(
      { msSinceLastRun, minIntervalMs },
      'Référentiel géographique déjà synchronisé récemment, exécution ignorée',
    );
    return;
  }

  await withCronLifecycle(job, { timeoutMs, minIntervalMs }, async (j) => {
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
  });
}
