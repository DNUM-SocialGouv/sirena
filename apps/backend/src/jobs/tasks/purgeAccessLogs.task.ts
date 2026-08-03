import type { Job } from 'bullmq';
import {
  countAccessLogs,
  countAccessLogsOlderThan,
  deleteAccessLogsOlderThan,
  getOldestAccessLogDate,
} from '../../features/accessLog/accessLog.service.js';
import { recordAccessLogPurge } from '../../features/monitoring/metrics.worker.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

export async function purgeAccessLogs(job: Job<JobDataMap['purge-access-logs']>): JobResult {
  const { retentionDays } = job.data;
  const logger = getLoggerStore();

  await withCronLifecycle(job, { retentionDays }, async () => {
    if (!Number.isInteger(retentionDays) || retentionDays < 1) {
      throw new Error(`Refusing to purge access logs: invalid retentionDays "${retentionDays}"`);
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const expiredCount = await countAccessLogsOlderThan(cutoff);

    logger.info(
      { retentionDays, cutoff: cutoff.toISOString(), expiredCount },
      'Access log purge: expired entries identified',
    );

    const deleteStartedAt = Date.now();
    const deletedCount = await deleteAccessLogsOlderThan(cutoff);
    const deleteDurationSeconds = (Date.now() - deleteStartedAt) / 1000;

    const [remainingCount, oldestCreatedAt] = await Promise.all([countAccessLogs(), getOldestAccessLogDate()]);

    recordAccessLogPurge({ remainingCount, oldestCreatedAt });

    if (oldestCreatedAt && oldestCreatedAt < cutoff) {
      logger.warn(
        { cutoff: cutoff.toISOString(), oldestCreatedAt: oldestCreatedAt.toISOString() },
        'Access log purge: entries older than the retention period remain',
      );
    }

    logger.info(
      {
        deletedCount,
        remainingCount,
        deleteDurationSeconds,
        oldestCreatedAt: oldestCreatedAt?.toISOString() ?? null,
      },
      'Access log purge: completed',
    );

    return {
      deletedCount,
      expiredCount,
      remainingCount,
      deleteDurationSeconds,
      cutoff: cutoff.toISOString(),
      oldestCreatedAt: oldestCreatedAt?.toISOString() ?? null,
    };
  });
}
