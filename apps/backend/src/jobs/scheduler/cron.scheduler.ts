import * as Sentry from '@sentry/node';
import { envVars } from '@/config/env';
import { createDefaultLogger } from '@/helpers/pino';
import { getLoggerStore, loggerStorage, sentryStorage } from '@/libs/asyncLocalStorage';
import { jobHandlers } from '../config/job.definitions';
import { cronQueue } from '../config/job.queues';

export async function startScheduler() {
  return loggerStorage.run(createDefaultLogger(), async () => {
    const logger = getLoggerStore();

    const runScheduler = async () => {
      const jobs = await cronQueue.getJobSchedulers();

      for (const { name, repeatEveryMs, data, runOnStart } of jobHandlers) {
        const job = jobs.find((j) => j.name === name);
        if (job) {
          await cronQueue.removeJobScheduler(job.key);
          logger.info(`[Scheduler] Removed previous repeat for ${name}`);
        }
        await cronQueue.add(name, data, {
          repeat: { every: repeatEveryMs },
          removeOnComplete: true,
        });
        logger.info(`[Scheduler] Scheduled ${name}`);

        if (runOnStart) {
          await cronQueue.add(name, data, {
            removeOnComplete: true,
          });
          logger.info(`[Scheduler] Triggered immediate run for ${name}`);
        }
      }
    };

    if (envVars.SENTRY_ENABLED) {
      return Sentry.withScope(async (scope) => {
        return sentryStorage.run(scope, async () => {
          scope.setContext('scheduler', {
            action: 'start_scheduler',
            jobCount: jobHandlers.length,
            timestamp: new Date().toISOString(),
          });

          return runScheduler();
        });
      });
    }

    return runScheduler();
  });
}
