import * as Sentry from '@sentry/node';
import type { Job } from 'bullmq';
import { importSingleDossier } from '@/features/dematSocial/dematSocial.service';
import { getUnresolvedFailures } from '@/features/dematSocial/dematSocialImportFailure.service';
import { withCronLifecycle } from '@/jobs/config/job.utils';
import { getLoggerStore, getSentryStore } from '@/libs/asyncLocalStorage';
import type { JobDataMap, JobResult } from '../config/job.types';

/**
 * Job to retry importing Démat Social files that failed
 */
export async function retryImportRequetes(job: Job<JobDataMap['retry-import-requetes']>): JobResult {
  const logger = getLoggerStore();
  const sentry = getSentryStore();

  await withCronLifecycle(job, { batchSize: job.data.batchSize }, async () => {
    const failures = await getUnresolvedFailures(job.data.batchSize);

    logger.info(
      { count: failures.length, batchSize: job.data.batchSize },
      `Found ${failures.length} unresolved import failures to retry`,
    );

    let successCount = 0;
    let errorCount = 0;

    for (const failure of failures) {
      const { dematSocialId, retryCount, errorType } = failure;

      try {
        logger.debug(
          { dematSocialId, retryCount, errorType },
          `Attempting to retry import for dossier ${dematSocialId}`,
        );

        const result = await importSingleDossier(dematSocialId);

        if (result.success && result.requeteId) {
          successCount += 1;
          logger.info(
            { dematSocialId, requeteId: result.requeteId, retryCount },
            `Successfully imported dossier ${dematSocialId} after ${retryCount} retries`,
          );
        } else {
          errorCount += 1;
          logger.warn(
            { dematSocialId, retryCount, errorType },
            `Failed to import dossier ${dematSocialId} after retry (retry ${retryCount})`,
          );
        }
      } catch (err) {
        errorCount += 1;
        logger.error(
          {
            err,
            dematSocialId,
            retryCount,
            errorType,
            failureId: failure.id,
          },
          `Error retrying import for dossier ${dematSocialId}`,
        );

        if (sentry) {
          sentry.setContext('retryImportRequetes', {
            dematSocialId,
            retryCount,
            errorType,
            failureId: failure.id,
            jobId: job.id,
          });
          Sentry.captureException(err, sentry);
        } else {
          Sentry.captureException(err, {
            contexts: {
              retryImportRequetes: {
                dematSocialId,
                retryCount,
                errorType,
                failureId: failure.id,
                jobId: job.id,
              },
            },
          });
        }
      }
    }

    logger.info(
      { successCount, errorCount, total: failures.length },
      `Retry import job completed: ${successCount} resolved, ${errorCount} still failing`,
    );

    return {
      successCount,
      errorCount,
      total: failures.length,
    };
  });
}
