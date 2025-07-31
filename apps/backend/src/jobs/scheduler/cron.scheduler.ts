import { createDefaultLogger } from '@/helpers/pino';
import { loggerStorage } from '@/libs/asyncLocalStorage';
import { jobHandlers } from '../config/job.definitions';
import { cronQueue } from '../config/job.queues';

export async function startScheduler() {
  loggerStorage.run(createDefaultLogger(), async () => {
    const logger = loggerStorage.getStore();
    const jobs = await cronQueue.getJobSchedulers();
    for (const { name, repeatEveryMs, data } of jobHandlers) {
      const job = jobs.find((j) => j.name === name);
      if (job) {
        await cronQueue.removeJobScheduler(job.key);
        logger?.info(`[Scheduler] Removed previous repeat for ${name}`);
      }
      await cronQueue.add(name, data, {
        repeat: { every: repeatEveryMs },
        removeOnComplete: true,
      });
      logger?.info(`[Scheduler] Scheduled ${name}`);
    }
  });
}
