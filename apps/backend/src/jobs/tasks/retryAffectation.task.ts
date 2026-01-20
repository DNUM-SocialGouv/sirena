import * as Sentry from '@sentry/node';
import type { Job } from 'bullmq';
import { assignEntitesToRequeteTask } from '../../features/dematSocial/affectation/affectation.js';
import { getLoggerStore, getSentryStore } from '../../libs/asyncLocalStorage.js';
import { prisma } from '../../libs/prisma.js';
import type { JobDataMap, JobResult } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';

export async function retryAffectation(job: Job<JobDataMap['retry-affectation']>): JobResult {
  const logger = getLoggerStore();
  const sentry = getSentryStore();

  await withCronLifecycle(job, { batchSize: job.data.batchSize }, async () => {
    // Find all requetes without RequeteEntite association
    const requetesWithoutAffectation = await prisma.requete.findMany({
      where: {
        requeteEntites: {
          none: {},
        },
      },
      select: {
        id: true,
        dematSocialId: true,
      },
      take: job.data.batchSize,
    });

    logger.info(
      { count: requetesWithoutAffectation.length },
      `Found ${requetesWithoutAffectation.length} requetes without RequeteEntite association`,
    );

    let successCount = 0;
    let errorCount = 0;

    for (const requete of requetesWithoutAffectation) {
      try {
        // Use dematSocialId if available, otherwise use id
        const identifier = requete.dematSocialId?.toString() ?? requete.id;

        logger.debug({ requeteId: requete.id, identifier }, 'Attempting to assign entities to requete');

        await assignEntitesToRequeteTask(identifier);

        successCount += 1;
        logger.info({ requeteId: requete.id, identifier }, 'Successfully assigned entities to requete');
      } catch (err) {
        errorCount += 1;
        logger.error(
          { err, requeteId: requete.id, dematSocialId: requete.dematSocialId },
          `Error assigning entities to requete ${requete.id}`,
        );
        if (sentry) {
          sentry.setContext('retryAffectation', {
            requeteId: requete.id,
            dematSocialId: requete.dematSocialId,
            jobId: job.id,
          });
          Sentry.captureException(err, sentry);
        } else {
          Sentry.captureException(err, {
            contexts: {
              retryAffectation: {
                requeteId: requete.id,
                dematSocialId: requete.dematSocialId,
                jobId: job.id,
              },
            },
          });
        }
        // Continue with next requete even if one fails
      }
    }

    logger.info(
      { successCount, errorCount, total: requetesWithoutAffectation.length },
      'Retry affectation job completed',
    );

    return {
      successCount,
      errorCount,
      total: requetesWithoutAffectation.length,
    };
  });
}
