// Must stay the first import: the modules below open connections as soon as they are
// evaluated, and a failure at that point must already be able to reach Sentry.
import './libs/instrument.js';
import { envVars } from './config/env.js';
import { createLivenessCheck } from './features/monitoring/liveness.js';
import { getPrometheusContentType, getPrometheusMetrics } from './features/monitoring/metrics.worker.js';
import { createMonitoringServer } from './features/monitoring/server.js';
import { createDefaultLogger } from './helpers/pino.js';
import { closeQuietly, FATAL_EXIT_CODE, installProcessGuards, SHUTDOWN_WATCHDOG_MS } from './helpers/processGuards.js';
import { cronWorker } from './jobs/worker/cron.worker.js';
import { createFileProcessingWorker } from './jobs/workers/fileProcessing.worker.js';
import { createSirecMigrationWorker } from './jobs/workers/sirecMigration.worker.js';

const logger = createDefaultLogger();

installProcessGuards({ logger, onFatal: () => shutdown(FATAL_EXIT_CODE) });

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

const checkLiveness = createLivenessCheck([
  { name: cronWorker.name, isRunning: () => cronWorker.isRunning() },
  { name: fileProcessingWorker.name, isRunning: () => fileProcessingWorker.isRunning() },
  ...(sirecMigrationWorker
    ? [{ name: sirecMigrationWorker.name, isRunning: () => sirecMigrationWorker.isRunning() }]
    : []),
]);

const monitoringServer = createMonitoringServer({
  getMetrics: getPrometheusMetrics,
  getContentType: getPrometheusContentType,
  port: envVars.WORKER_MONITORING_PORT,
  checkLiveness,
});

// Hoisted function declaration: the guards installed above can call it even while the workers
// it closes are still in their temporal dead zone, which `closeQuietly` swallows.
async function shutdown(exitCode = 0) {
  logger.info('[worker] Shutting down...');

  const watchdog = setTimeout(() => {
    logger.error('[worker] Shutdown watchdog fired, forcing exit');
    process.exit(exitCode || FATAL_EXIT_CODE);
  }, SHUTDOWN_WATCHDOG_MS);
  watchdog.unref();

  await closeQuietly(
    'Monitoring server',
    logger,
    () =>
      new Promise<void>((resolve, reject) => {
        monitoringServer.close((err) => (err ? reject(err) : resolve()));
      }),
  );
  await closeQuietly('Cron worker', logger, () => cronWorker.close());
  await closeQuietly('File processing worker', logger, () => fileProcessingWorker.close());
  if (sirecMigrationWorker) {
    await closeQuietly('SIREC migration worker', logger, () => sirecMigrationWorker.close());
  }

  clearTimeout(watchdog);
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
