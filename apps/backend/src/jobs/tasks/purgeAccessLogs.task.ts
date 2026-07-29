import type { Job } from 'bullmq';
import { prisma } from '../../libs/prisma.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

export async function purgeAccessLogs(job: Job<JobDataMap['purge-access-logs']>): JobResult {
  const { retentionDays } = job.data;

  await withCronLifecycle(job, { retentionDays }, async () => {
    if (!Number.isInteger(retentionDays) || retentionDays < 1) {
      throw new Error(`Refusing to purge access logs: invalid retentionDays "${retentionDays}"`);
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const { count } = await prisma.accessLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return { deletedCount: count, cutoff: cutoff.toISOString() };
  });
}
