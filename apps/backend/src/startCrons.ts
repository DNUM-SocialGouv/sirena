import { startScheduler } from '@/jobs/scheduler.job';

startScheduler()
  .then(() => {
    console.log('[Scheduler] All jobs scheduled');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Scheduler] Failed to start', err);
    process.exit(1);
  });
