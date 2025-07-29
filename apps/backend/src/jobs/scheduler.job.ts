import { jobHandlers } from './definitions.job';
import { cronQueue } from './queues.job';

export async function startScheduler() {
  const jobs = await cronQueue.getJobSchedulers();
  for (const { name, repeatEveryMs } of jobHandlers) {
    const job = jobs.find((j) => j.name === name);
    if (job) {
      await cronQueue.removeJobScheduler(job.key);
      console.log(`[Scheduler] Removed previous repeat for ${name}`);
    }
    await cronQueue.add(
      name,
      {
        timeoutMs: 1000 * 60 * 5,
      },
      {
        repeat: { every: repeatEveryMs },
        removeOnComplete: true,
      },
    );
    console.log(`[Scheduler] Scheduled ${name}`);
  }
}
