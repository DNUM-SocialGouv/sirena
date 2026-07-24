import type { Job } from 'bullmq';
import { recordFileIntegrity } from '../../features/monitoring/metrics.worker.js';
import { runFileIntegrityCheck } from '../../features/uploadedFiles/fileIntegrity.service.js';
import { abortControllerStorage, getLoggerStore } from '../../libs/asyncLocalStorage.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

export async function fileIntegrityCheck(job: Job<JobDataMap['file-integrity-check']>): JobResult {
  const logger = getLoggerStore();

  await withCronLifecycle(job, { timeoutMs: job.data.timeoutMs }, async (j) => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      logger.warn(`Job ${job.name} aborted after ${j.data.timeoutMs}ms`);
      controller.abort();
    }, j.data.timeoutMs);

    try {
      return await abortControllerStorage.run(controller, async () => {
        const result = await runFileIntegrityCheck();
        recordFileIntegrity(result);
        return result;
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}
