import { cronWorker } from './jobs/worker.job';
import './libs/instrument';

console.log(`[worker] Starting cron worker for queue "${cronWorker.name}"`);

cronWorker.on('completed', (job) => {
  console.log(`[worker] Job "${job.name}" completed`);
});

cronWorker.on('failed', (job, err) => {
  console.error(`[worker] Job "${job?.name}" failed:`, err);
});

const shutdown = async () => {
  console.log('[worker] Shutting down...');
  await cronWorker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
