import { config } from './config.js';
import { logger } from './logger.js';
import { createMonitoringServer } from './monitoring.js';
import { analyticsDb, sourceDb } from './prisma.js';
import { incrementalQueue, incrementalWorker } from './workers/incremental.worker.js';
import { reconciliationQueue, reconciliationWorker } from './workers/reconciliation.worker.js';

const monitoringServer = createMonitoringServer(config.MONITORING_PORT);

logger.info(
  {
    incrementalIntervalMs: config.INCREMENTAL_INTERVAL_MS,
    reconciliationCron: config.RECONCILIATION_CRON,
    driftThreshold: config.DRIFT_THRESHOLD_PERCENT,
    monitoringPort: config.MONITORING_PORT,
  },
  'Analytics sync workers started',
);

const shutdown = async () => {
  logger.info('Shutting down...');
  await new Promise<void>((resolve, reject) => {
    monitoringServer.close((err) => (err ? reject(err) : resolve()));
  });
  await Promise.all([incrementalWorker.close(), reconciliationWorker.close()]);
  await Promise.all([incrementalQueue.close(), reconciliationQueue.close()]);
  await Promise.all([sourceDb.$disconnect(), analyticsDb.$disconnect()]);
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
