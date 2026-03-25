import * as Sentry from '@sentry/node';
import { envVars } from '../../config/env.js';
import { connection } from '../../config/redis.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { getLoggerStore, loggerStorage, sentryStorage } from '../../libs/asyncLocalStorage.js';
import { jobHandlers } from '../config/job.definitions.js';
import { cronQueue } from '../config/job.queues.js';

const SCHEDULER_LOCK_KEY = 'sirena:scheduler:lock';
const SCHEDULER_LOCK_TTL_SECONDS = 30;

export async function startScheduler() {
  return loggerStorage.run(createDefaultLogger(), async () => {
    const logger = getLoggerStore();

    const runScheduler = async () => {
      const acquired = await connection.set(
        SCHEDULER_LOCK_KEY,
        process.pid.toString(),
        'EX',
        SCHEDULER_LOCK_TTL_SECONDS,
        'NX',
      );

      if (!acquired) {
        logger.info('[Scheduler] Another instance is already scheduling jobs, skipping');
        return;
      }

      try {
        const schedulers = await cronQueue.getJobSchedulers();

        for (const { name, repeatEveryMs, data, runOnStart } of jobHandlers) {
          const existing = schedulers.find((j) => j.name === name);
          if (existing) {
            await cronQueue.removeJobScheduler(existing.key);
            logger.info(`[Scheduler] Removed previous repeat for ${name}`);
          }

          const waitingJobs = await cronQueue.getJobs(['waiting', 'delayed']);
          const staleJobs = waitingJobs.filter((j) => j.name === name);
          for (const staleJob of staleJobs) {
            await staleJob.remove();
          }
          if (staleJobs.length > 0) {
            logger.info(`[Scheduler] Removed ${staleJobs.length} stale ${name} jobs from queue`);
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
      } finally {
        await connection.del(SCHEDULER_LOCK_KEY);
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
