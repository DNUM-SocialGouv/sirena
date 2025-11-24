import { getPrometheusContentType, getPrometheusMetrics } from './features/monitoring/metrics.worker';
import { createMonitoringServer } from './features/monitoring/server';
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

const monitoringServer = createMonitoringServer({
  getMetrics: getPrometheusMetrics,
  getContentType: getPrometheusContentType,
});

const shutdown = async () => {
  logger.info('[worker] Shutting down...');

  await new Promise<void>((resolve, reject) => {
    monitoringServer.close((err) => {
      if (err) {
        reject(err);
      } else {
        logger.info('Monitoring server closed');
        resolve();
      }
    });
  });

  await cronWorker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
