import * as Sentry from '@sentry/node';
import { Worker } from 'bullmq';
import { envVars } from '@/config/env';
import { connection } from '@/config/redis';
import { createDefaultLogger } from '@/helpers/pino';
import { loggerStorage, sentryStorage } from '@/libs/asyncLocalStorage';
import { jobHandlers } from '../config/job.definitions';
import { cronQueue } from '../config/job.queues';

const handlerMap = Object.fromEntries(jobHandlers.map((j) => [j.name, j.task]));

export const cronWorker = new Worker(
  cronQueue.name,
  async (job) => {
    const handler = handlerMap[job.name];
    if (!handler) {
      throw new Error(`No handler for job: ${job.name}`);
    }

    return loggerStorage.run(createDefaultLogger(), async () => {
      if (envVars.SENTRY_ENABLED) {
        return sentryStorage.run(Sentry, async () => {
          Sentry.setContext('cron_job', {
            name: job.name,
            id: job.id,
            attemptsMade: job.attemptsMade,
            processedOn: job.processedOn,
            timestamp: job.timestamp,
          });

          return await handler(job);
        });
      }

      return await handler(job);
    });
  },
  { connection, concurrency: 5 },
);
