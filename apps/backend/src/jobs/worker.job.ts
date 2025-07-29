import { Worker } from 'bullmq';
import { connection } from '@/config/redis';
import { jobHandlers } from './definitions.job';
import { cronQueue } from './queues.job';

const handlerMap = Object.fromEntries(jobHandlers.map((j) => [j.name, j.task]));

export const cronWorker = new Worker(
  cronQueue.name,
  async (job) => {
    const handler = handlerMap[job.name];
    if (!handler) {
      throw new Error(`No handler for job: ${job.name}`);
    }
    return handler(job);
  },
  { connection },
);
