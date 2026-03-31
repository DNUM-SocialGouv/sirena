import { config } from '../config.js';
import { logger } from '../logger.js';
import { analyticsDb, sourceDb } from '../prisma.js';
import { runIncrementalSync } from '../sync/incremental.js';
import { createSyncWorker } from './shared.js';

export const { queue: incrementalQueue, worker: incrementalWorker } = createSyncWorker({
  queueName: 'analytics-incremental',
  schedule: { every: config.INCREMENTAL_INTERVAL_MS },
  schedulerName: 'incremental-sync',
  run: () => runIncrementalSync(sourceDb, analyticsDb, logger),
  logger,
});
