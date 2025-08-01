import { createDefaultLogger } from '@/helpers/pino';
import { startScheduler } from './cron.scheduler';

const logger = createDefaultLogger();

startScheduler()
  .then(() => {
    logger.info('[Scheduler] All jobs scheduled');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('[Scheduler] Failed to start', err);
    process.exit(1);
  });
