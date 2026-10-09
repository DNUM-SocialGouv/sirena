import { type Job, UnrecoverableError, Worker } from 'bullmq';
import { ZodError } from 'zod';
import { connection } from '../../config/redis.js';
import { migrateSirecFiles } from '../../features/sirecMigration/sirecMigration.files.service.js';
import { fetchSirecData } from '../../features/sirecMigration/sirecMigration.repository.js';
import {
  deleteRequeteWithRelatedData,
  getRequeteIdFromSirecId,
  type SaveFromSirecResult,
  saveFromSirec,
} from '../../features/sirecMigration/sirecMigration.service.js';
import {
  ensureAffectationEntries,
  initAffectationTransco,
} from '../../features/sirecMigration/transco/affectation/affectation.transco.js';
import { SirecDataError, SirecTranscoError } from '../../features/sirecMigration/transco/sirecTransco.error.js';
import { transformSirecReclamation } from '../../features/sirecMigration/transformers/sirecMigration.transformer.js';
import { collectAffectationSirecIds } from '../../features/sirecMigration/transformers/situation/sirecMigration.affectation.transformer.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { getLoggerStore, loggerStorage } from '../../libs/asyncLocalStorage.js';
import { SIREC_MIGRATION_QUEUE_NAME, type SirecMigrationJobData } from '../queues/sirecMigration.queue.js';

const SIREC_MIGRATION_CONCURRENCY = 50;
export const TRANSCO_INIT_RETRY_DELAY_MS = 30_000;

const processMigration = async (job: Job<SirecMigrationJobData>): Promise<void> => {
  const { sirecId, deleteIfExists, migrateFiles, mockFilePath } = job.data;

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

      await ensureAffectationEntries(collectAffectationSirecIds(sirecData));

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

      let saveResult: SaveFromSirecResult;
      try {
        saveResult = await saveFromSirec(data);
      } catch (err) {
        if (err instanceof ZodError) {
          logger.error({ sirecId, validationErrors: err.issues }, 'SIREC record failed schema validation, skipping');
          return;
        }
        throw err;
      }

      const { requeteId: sirenaRequeteId, etapeIdsByFileType, etapeIdsByMainCouranteId, faitSituationIds } = saveResult;

      logger.info({ requeteId: sirenaRequeteId, sirecId: data.sirecId }, 'SIREC record migrated successfully');

      if (migrateFiles !== false) {
        await migrateSirecFiles(
          sirecId,
          sirenaRequeteId,
          etapeIdsByFileType,
          etapeIdsByMainCouranteId,
          faitSituationIds,
          mockFilePath,
        );
      }
    },
  );
};

/** Charge la transco d'affectation (en réessayant jusqu'au succès), puis démarre le worker. */
const startWhenTranscoReady = async (
  worker: Worker<SirecMigrationJobData>,
  logger: ReturnType<typeof createDefaultLogger>,
): Promise<void> => {
  while (!worker.closing) {
    try {
      await initAffectationTransco();
      break;
    } catch (err) {
      logger.error(
        { err, retryInMs: TRANSCO_INIT_RETRY_DELAY_MS },
        'SIREC affectation transco initialization failed, retrying',
      );
      await new Promise((resolve) => setTimeout(resolve, TRANSCO_INIT_RETRY_DELAY_MS));
    }
  }
  if (worker.closing) return;
  logger.info('SIREC affectation transco initialized, starting worker');
  await worker.run();
};

export const createSirecMigrationWorker = (): Worker<SirecMigrationJobData> => {
  const worker = new Worker<SirecMigrationJobData>(SIREC_MIGRATION_QUEUE_NAME, processMigration, {
    connection,
    concurrency: SIREC_MIGRATION_CONCURRENCY,
    // Démarré manuellement une fois la transco d'affectation chargée
    autorun: false,
  });

  const eventLogger = createDefaultLogger().child({ context: 'sirec-migration-worker' });

  startWhenTranscoReady(worker, eventLogger).catch((err) => {
    eventLogger.error({ err }, 'SIREC migration worker stopped unexpectedly');
  });

  worker.on('completed', (job) => {
    eventLogger.info({ jobId: job.id, sirecId: job.data.sirecId }, 'Migration job completed');
  });

  worker.on('failed', (job, err) => {
    eventLogger.error({ jobId: job?.id, sirecId: job?.data.sirecId, err }, 'Migration job failed');
  });

  return worker;
};
