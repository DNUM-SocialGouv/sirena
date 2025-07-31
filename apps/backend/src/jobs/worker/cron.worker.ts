import { Worker } from 'bullmq';
import { connection } from '@/config/redis';
import { createDefaultLogger } from '@/helpers/pino';
import { loggerStorage } from '@/libs/asyncLocalStorage';
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
    return loggerStorage.run(createDefaultLogger(), async () => await handler(job));
  },
  { connection },
);
