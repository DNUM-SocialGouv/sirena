import type { Job } from 'bullmq';
import { getLastCron } from '@/crons/crons.service';
import { importRequetes } from '@/features/dematSocial/dematSocial.service';
import { withCronLifecycle } from '@/jobs/jobs.utils';
import { abortControllerStorage } from '@/libs/asyncLocalStorage';
import type { JobDataMap, JobResult } from '../jobs.type';

export async function fetchRequests(job: Job<JobDataMap['fetch-requests']>): JobResult {
  const cron = await getLastCron(job.name);
  const date = cron?.startedAt;
  await withCronLifecycle(job, { date }, async (j) => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      console.warn(`Job ${job.name} aborted after ${job.data.timeoutMs}ms`);
      controller.abort();
    }, j.data.timeoutMs);

    try {
      return await abortControllerStorage.run(controller, async () => await importRequetes(date));
    } finally {
      clearTimeout(timeout);
    }
  });
}
