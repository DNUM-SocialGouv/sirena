import { createDefaultLogger } from '../../helpers/pino.js';
import { startScheduler } from './cron.scheduler.js';

const logger = createDefaultLogger();

startScheduler()
  .then(() => {
    logger.info('[Scheduler] All jobs scheduled');
  })
  .catch((err) => {
    logger.error('[Scheduler] Failed to start', err);
    process.exit(1);
  });
