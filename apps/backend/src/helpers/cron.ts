import * as Sentry from '@sentry/node';
import cron, { type TaskContext } from 'node-cron';

export const createCron = (duration: string, name: string, callback: (ctx: TaskContext) => Promise<void>) => {
  if (process.env.SENTRY_ENABLED === 'true') {
    const CronJobWithCheckIn = Sentry.cron.instrumentNodeCron(cron);
    return CronJobWithCheckIn.createTask(duration, callback, { noOverlap: true, name });
  }
  return cron.createTask(duration, callback, { noOverlap: true, name });
};
