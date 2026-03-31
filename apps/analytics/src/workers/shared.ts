import type { ConnectionOptions } from 'bullmq';
import { Queue, Worker } from 'bullmq';
import type { Logger } from 'pino';
import { config } from '../config.js';

type SyncWorkerConfig = {
  queueName: string;
  schedule: { every: number } | { pattern: string };
  schedulerName: string;
  run: () => Promise<unknown>;
  logger: Logger;
};

export function createSyncWorker({ queueName, schedule, schedulerName, run, logger }: SyncWorkerConfig) {
  const connection: ConnectionOptions = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    username: config.REDIS_USERNAME,
    password: config.REDIS_PASSWORD,
  };

  const queue = new Queue(queueName, { connection });
  queue
    .upsertJobScheduler(schedulerName, schedule, { name: schedulerName })
    .catch((err) => logger.error({ err, schedulerName }, 'Failed to setup job scheduler'));

  const worker = new Worker(
    queueName,
    async (job) => {
      logger.info({ jobId: job.id }, `Starting ${schedulerName}`);
      try {
        const result = await run();
        logger.info({ jobId: job.id }, `Completed ${schedulerName}`);
        return result;
      } catch (err) {
        logger.error({ jobId: job.id, err }, `Failed ${schedulerName}`);
        throw err;
      }
    },
    { connection, concurrency: 1 },
  );

  worker.on('error', (err) => logger.error({ err }, `Worker error in ${queueName}`));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, `Job failed in ${queueName}`));

  return { queue, worker };
}
