import * as Sentry from '@sentry/node';
import type { Job } from 'bullmq';
import { endCron, getLastCron, startCron } from '@/crons/crons.service';
import { importRequetes } from '@/features/dematSocial/dematSocial.service';
import { serializeError } from '@/helpers/errors';
import { abortControllerStorage } from '@/libs/asyncLocalStorage';
import type { JobDataMap, JobResult } from '../jobs.type';

export async function fetchRequests(job: Job<JobDataMap['fetch-requests']>): JobResult {
  const controller = new AbortController();
  const name = job.name;
  const startedAt = new Date();
  const cron = await getLastCron(name);
  const date = cron?.startedAt;
  const startedCron = await startCron({ params: { date }, name, startedAt });
  const timeout = setTimeout(() => {
    console.warn(`Job ${job.name} aborted after ${job.data.timeoutMs}ms`);
    controller.abort();
  }, job.data.timeoutMs);
  try {
    const result = await abortControllerStorage.run(controller, async () => await importRequetes(date));
    const endedAt = new Date();
    await endCron({
      id: startedCron.id,
      endedAt,
      result,
      state: 'success',
    });
  } catch (error) {
    const endedAt = new Date();
    const result = serializeError(error);
    await endCron({
      id: startedCron.id,
      endedAt,
      result,
      state: 'error',
    });
    if (process.env.SENTRY_ENABLED === 'true') {
      Sentry.captureException(error, {
        extra: {
          jobName: job.name,
          jobId: job.id,
        },
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
