import { type Job, UnrecoverableError, Worker } from 'bullmq';
import { ZodError } from 'zod';
import { connection } from '../../config/redis.js';
import { fetchSirecData } from '../../features/sirecMigration/sirecMigration.repository.js';
import {
  deleteRequeteWithRelatedData,
  getRequeteIdFromSirecId,
  saveFromSirec,
} from '../../features/sirecMigration/sirecMigration.service.js';
import { initAffectationTransco } from '../../features/sirecMigration/transco/affectation/affectation.transco.js';
import { SirecDataError, SirecTranscoError } from '../../features/sirecMigration/transco/sirecTransco.error.js';
import { transformSirecReclamation } from '../../features/sirecMigration/transformers/sirecMigration.transformer.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { getLoggerStore, loggerStorage } from '../../libs/asyncLocalStorage.js';
import { SIREC_MIGRATION_QUEUE_NAME, type SirecMigrationJobData } from '../queues/sirecMigration.queue.js';

let transcoInitPromise: Promise<void> | null = null;

const processMigration = async (job: Job<SirecMigrationJobData>): Promise<void> => {
  if (!transcoInitPromise) {
    transcoInitPromise = initAffectationTransco();
  }
  await transcoInitPromise;
  const { sirecId, deleteIfExists } = job.data;

  return loggerStorage.run(
    createDefaultLogger().child({ context: 'sirec-migration-worker', sirecId, jobId: job.id }),
    async () => {
      const logger = getLoggerStore();
      logger.info({ sirecId }, 'Starting SIREC migration');

      const sirecData = await fetchSirecData(sirecId);
      if (!sirecData) {
        logger.error({ sirecId }, 'SIREC record not found, skipping');
        return;
      }

      const existingRequeteId = await getRequeteIdFromSirecId(sirecId);
      if (existingRequeteId !== null) {
        if (!deleteIfExists) {
          logger.info({ requeteId: existingRequeteId, sirecId }, 'SIREC record already migrated, skipping');
          return;
        }
        logger.debug(
          { requeteId: existingRequeteId, sirecId },
          'SIREC record already migrated, deleting existing data before re-migrating',
        );
        await deleteRequeteWithRelatedData(existingRequeteId);
      }

      let data: ReturnType<typeof transformSirecReclamation>;
      try {
        data = transformSirecReclamation(sirecData);
      } catch (err) {
        if (err instanceof SirecTranscoError) {
          logger.error(
            { sirecId, idDico: err.idDico, tableName: err.tableName, stackTrace: err.stack },
            'Unknown SIREC id_dico in transco table',
          );
          throw new UnrecoverableError(err.message);
        }
        if (err instanceof SirecDataError) {
          logger.error({ sirecId, stackTrace: err.stack }, err.message);
          throw new UnrecoverableError(err.message);
        }
        throw err;
      }

      let sirenaRequeteId: string;
      try {
        sirenaRequeteId = await saveFromSirec(data);
      } catch (err) {
        if (err instanceof ZodError) {
          logger.error({ sirecId, validationErrors: err.issues }, 'SIREC record failed schema validation, skipping');
          return;
        }
        throw err;
      }

      logger.info({ requeteId: sirenaRequeteId, sirecId: data.sirecId }, 'SIREC record migrated successfully');
    },
  );
};

export const createSirecMigrationWorker = (): Worker<SirecMigrationJobData> => {
  const worker = new Worker<SirecMigrationJobData>(SIREC_MIGRATION_QUEUE_NAME, processMigration, {
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
