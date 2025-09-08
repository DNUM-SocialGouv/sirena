import { createDefaultLogger } from './helpers/pino';
import { cronWorker } from './jobs/worker/cron.worker';
import './libs/instrument';

const logger = createDefaultLogger();

logger.info(`[worker] Starting cron worker for queue "${cronWorker.name}"`);

cronWorker.on('completed', (job) => {
  logger.info(`[worker] Job "${job.name}" completed`);
});

cronWorker.on('failed', (job, err) => {
  logger.error({ err }, `[worker] Job "${job?.name}" failed:`);
});

const shutdown = async () => {
  logger.info('[worker] Shutting down...');
  await cronWorker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
