import * as Sentry from '@sentry/node';
import { Worker } from 'bullmq';
import { envVars } from '../../config/env.js';
import { connection } from '../../config/redis.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { loggerStorage, sentryStorage } from '../../libs/asyncLocalStorage.js';
import { jobHandlers } from '../config/job.definitions.js';
import { cronQueue } from '../config/job.queues.js';

const handlerMap = Object.fromEntries(jobHandlers.map((j) => [j.name, j.task]));

export const cronWorker = new Worker(
  cronQueue.name,
  async (job) => {
    const handler = handlerMap[job.name];
    if (!handler) {
      throw new Error(`No handler for job: ${job.name}`);
    }

    const jobLogger = createDefaultLogger().child({
      job_name: job.name,
      job_id: job.id,
      attempt: job.attemptsMade + 1,
    });

    return loggerStorage.run(jobLogger, async () => {
      if (envVars.SENTRY_ENABLED) {
        return Sentry.withScope(async (scope) => {
          return sentryStorage.run(scope, async () => {
            scope.setContext('cron_job', {
              name: job.name,
              id: job.id,
              attemptsMade: job.attemptsMade,
              processedOn: job.processedOn,
              timestamp: job.timestamp,
            });

            return await handler(job);
          });
        });
      }

      return await handler(job);
    });
  },
  { connection, concurrency: 5 },
);

const eventLogger = createDefaultLogger().child({ context: 'cron-worker' });

cronWorker.on('completed', (job) => {
  eventLogger.info({ jobName: job.name, jobId: job.id, attemptsMade: job.attemptsMade }, 'Cron worker job completed');
});

// Catches BullMQ-level failures that never reach withCronLifecycle's try/catch
// (stalled jobs, lock-renewal loss, OOM-killed or restarted process mid-run).
// Without this, a stalled cron job produces no logs at all.
cronWorker.on('failed', (job, err) => {
  eventLogger.error(
    {
      jobName: job?.name,
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      failedReason: job?.failedReason,
      err,
    },
    'Cron worker job failed',
  );
});

cronWorker.on('stalled', (jobId) => {
  eventLogger.warn(
    { jobId },
    'Cron worker job stalled (lock not renewed — likely blocked event loop or process restart)',
  );
});

cronWorker.on('error', (err) => {
  eventLogger.error({ err }, 'Cron worker error');
});
