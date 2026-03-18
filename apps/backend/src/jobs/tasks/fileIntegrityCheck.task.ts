import type { Job } from 'bullmq';
import { recordFileIntegrity } from '../../features/monitoring/metrics.worker.js';
import { runFileIntegrityCheck } from '../../features/uploadedFiles/fileIntegrity.service.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

export async function fileIntegrityCheck(job: Job<JobDataMap['file-integrity-check']>): JobResult {
  await withCronLifecycle(job, {}, async () => {
    const result = await runFileIntegrityCheck();
    recordFileIntegrity(result);
    return result;
  });
}
