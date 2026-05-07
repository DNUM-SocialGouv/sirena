import { type Job, Worker } from 'bullmq';
import { envVars } from '../../config/env.js';
import { connection } from '../../config/redis.js';
import { fetchSirecReclamationById } from '../../features/sirecMigration/sirecMigration.repository.js';
import { getRequeteIdFromSirecId, saveRequeteFromSirec } from '../../features/sirecMigration/sirecMigration.service.js';
import { transformSirecReclamation } from '../../features/sirecMigration/sirecMigration.transformer.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { getLoggerStore, loggerStorage } from '../../libs/asyncLocalStorage.js';
import type { SirecMigrationJobData } from '../queues/sirecMigration.queue.js';

const processMigration = async (job: Job<SirecMigrationJobData>): Promise<void> => {
  const { sirecId } = job.data;

  return loggerStorage.run(
    createDefaultLogger().child({ context: 'sirec-migration-worker', sirecId, jobId: job.id }),
    async () => {
      const logger = getLoggerStore();
      logger.info({ sirecId }, 'Starting SIREC migration');

      const row = await fetchSirecReclamationById(sirecId);
      if (!row) {
        logger.error({ sirecId }, 'SIREC record not found, skipping');
        return;
      }

      const data = transformSirecReclamation(row);

      const existingRequeteId = await getRequeteIdFromSirecId(row.id_data);

      if (existingRequeteId !== null) {
        logger.info({ requeteId: existingRequeteId, sirecId: data.sirecId }, 'SIREC record already migrated, skipping');
        return;
      }

      const sirenaRequeteId = await saveRequeteFromSirec(data);

      logger.info({ requeteId: sirenaRequeteId, sirecId: data.sirecId }, 'SIREC record migrated successfully');
    },
  );
};

export const createSirecMigrationWorker = (): Worker<SirecMigrationJobData> => {
  const worker = new Worker<SirecMigrationJobData>(envVars.REDIS_MIGRATION_QUEUE_NAME, processMigration, {
    connection,
    concurrency: 5,
  });

  const eventLogger = createDefaultLogger().child({ context: 'sirec-migration-worker' });

  worker.on('completed', (job) => {
    eventLogger.info({ jobId: job.id, sirecId: job.data.sirecId }, 'Migration job completed');
  });

  worker.on('failed', (job, err) => {
    eventLogger.error({ jobId: job?.id, sirecId: job?.data.sirecId, err }, 'Migration job failed');
  });

  return worker;
};
