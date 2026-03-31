import { config } from '../config.js';
import { logger } from '../logger.js';
import { analyticsDb, sourceDb } from '../prisma.js';
import { runReconciliation } from '../sync/reconciliation.js';
import { createSyncWorker } from './shared.js';

export const { queue: reconciliationQueue, worker: reconciliationWorker } = createSyncWorker({
  queueName: 'analytics-reconciliation',
  schedule: { pattern: config.RECONCILIATION_CRON },
  schedulerName: 'reconciliation-sync',
  run: () => runReconciliation(sourceDb, analyticsDb, logger, config.DRIFT_THRESHOLD_PERCENT),
  logger,
});
