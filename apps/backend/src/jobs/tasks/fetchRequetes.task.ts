import type { Job } from 'bullmq';
import { envVars } from '../../config/env.js';
import { getLastCron } from '../../crons/crons.service.js';
import { importRequetes } from '../../features/dematSocial/dematSocial.service.js';
import { abortControllerStorage, getLoggerStore, getSentryStore } from '../../libs/asyncLocalStorage.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

export async function fetchRequetes(job: Job<JobDataMap['fetch-requetes']>): JobResult {
  const logger = getLoggerStore();
  const cron = await getLastCron(job.name);
  const date = cron?.startedAt;

  if (envVars.SENTRY_ENABLED) {
    try {
      const sentry = getSentryStore();
      sentry.setContext('fetch_requetes', {
        lastCronDate: date?.toISOString() || null,
        timeoutMs: job.data.timeoutMs,
        jobId: job.id,
      });
    } catch (sentryError) {
      logger.warn({ err: sentryError }, 'Failed to set Sentry context for fetchRequetes');
    }
  }

  await withCronLifecycle(job, { date }, async (j) => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      logger.warn(`Job ${job.name} aborted after ${job.data.timeoutMs}ms`);
      controller.abort();
    }, j.data.timeoutMs);

    try {
      return await abortControllerStorage.run(controller, async () => await importRequetes(date));
    } finally {
      clearTimeout(timeout);
    }
  });
}
