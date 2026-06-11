import { envVars } from './config/env.js';
import { getPrometheusContentType, getPrometheusMetrics } from './features/monitoring/metrics.worker.js';
import { createMonitoringServer } from './features/monitoring/server.js';
import { createDefaultLogger } from './helpers/pino.js';
import { cronWorker } from './jobs/worker/cron.worker.js';
import { createFileProcessingWorker } from './jobs/workers/fileProcessing.worker.js';
import { createSirecMigrationWorker } from './jobs/workers/sirecMigration.worker.js';
import './libs/instrument.js';

const logger = createDefaultLogger();

logger.info(`[worker] Starting cron worker for queue "${cronWorker.name}"`);

cronWorker.on('completed', (job) => {
  logger.info(`[worker] Job "${job.name}" completed`);
});

cronWorker.on('failed', (job, err) => {
  logger.error({ err }, `[worker] Job "${job?.name}" failed:`);
});

const fileProcessingWorker = createFileProcessingWorker();
logger.info(`[worker] Starting file processing worker for queue "${fileProcessingWorker.name}"`);

const { MARIADB_SIREC_HOST, MARIADB_SIREC_DB, MARIADB_SIREC_USER, MARIADB_SIREC_PASSWORD } = envVars;
const sirecMigrationWorker =
  MARIADB_SIREC_HOST && MARIADB_SIREC_DB && MARIADB_SIREC_USER && MARIADB_SIREC_PASSWORD
    ? createSirecMigrationWorker()
    : null;

if (sirecMigrationWorker) {
  logger.info(`[worker] Starting SIREC migration worker for queue "${sirecMigrationWorker.name}"`);
} else {
  logger.info('[worker] SIREC migration worker not started (MARIADB env vars not set)');
}

const monitoringServer = createMonitoringServer({
  getMetrics: getPrometheusMetrics,
  getContentType: getPrometheusContentType,
  port: envVars.WORKER_MONITORING_PORT,
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
  await fileProcessingWorker.close();
  await sirecMigrationWorker?.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
