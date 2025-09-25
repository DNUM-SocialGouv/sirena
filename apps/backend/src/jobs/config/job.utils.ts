import * as Sentry from '@sentry/node';
import type { Job } from 'bullmq';
import { envVars } from '@/config/env';
import { endCron, startCron } from '@/crons/crons.service';
import { serializeError } from '@/helpers/errors';
import { getLoggerStore, getSentryStore } from '@/libs/asyncLocalStorage';

export async function withCronLifecycle<R extends Record<string, unknown>, J extends Job>(
  job: J,
  params: Record<string, unknown>,
  fn: (ctx: J) => Promise<R>,
): Promise<R> {
  const name = job.name;
  const startedAt = new Date();

  const startedCron = await startCron({
    name,
    startedAt,
    params,
  });

  try {
    const result = await fn(job);
    const endedAt = new Date();
    await endCron({
      id: startedCron.id,
      endedAt,
      result,
      state: 'success',
    });
    return result;
  } catch (error) {
    const endedAt = new Date();
    const result = serializeError(error);

    await endCron({
      id: startedCron.id,
      endedAt,
      result,
      state: 'error',
    });

    if (envVars.SENTRY_ENABLED) {
      try {
        const sentryScope = getSentryStore();
        if (sentryScope) {
          sentryScope.setContext('job', {
            jobName: job.name,
            jobId: job.id,
            params,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
          });
          Sentry.captureException(error, sentryScope);
        } else {
          Sentry.captureException(error, {
            contexts: {
              job: {
                jobName: job.name,
                jobId: job.id,
                params,
                startedAt: startedAt.toISOString(),
                endedAt: endedAt.toISOString(),
              },
            },
          });
        }
      } catch (err) {
        const logger = getLoggerStore();
        logger.error({ err }, 'Failed to capture exception in Sentry:');
      }
    }

    throw error;
  }
}
