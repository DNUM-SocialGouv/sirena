import type { Job } from 'bullmq';
import { getLastCron } from '@/crons/crons.service';
import { importRequetes } from '@/features/dematSocial/dematSocial.service';
import { withCronLifecycle } from '@/jobs/config/job.utils';
import { abortControllerStorage, loggerStorage } from '@/libs/asyncLocalStorage';
import type { JobDataMap, JobResult } from '../config/job.types';

export async function fetchRequetes(job: Job<JobDataMap['fetch-requetes']>): JobResult {
  const logger = loggerStorage.getStore();
  const cron = await getLastCron(job.name);
  const date = cron?.startedAt;
  await withCronLifecycle(job, { date }, async (j) => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      logger?.warn(`Job ${job.name} aborted after ${job.data.timeoutMs}ms`);
      controller.abort();
    }, j.data.timeoutMs);

    try {
      return await abortControllerStorage.run(controller, async () => await importRequetes(date));
    } finally {
      clearTimeout(timeout);
    }
  });
}
