import * as Sentry from '@sentry/node';
import pino from 'pino';
import pretty from 'pino-pretty';
import { envVars } from '../config/env.js';
import { runFileIntegrityCheck } from '../features/uploadedFiles/fileIntegrity.service.js';
import { createPinoConfig } from '../helpers/pino.js';
import { abortControllerStorage, loggerStorage, sentryStorage } from '../libs/asyncLocalStorage.js';
import { prisma } from '../libs/prisma.js';
import '../libs/instrument.js';

const createSyncLogger = () => {
  const destination =
    envVars.LOG_FORMAT === 'pretty'
      ? pretty({ ignore: 'pid,hostname', translateTime: 'SYS:standard', messageFormat: '{msg}', sync: true })
      : pino.destination({ sync: true });
  return pino(createPinoConfig(), destination);
};

const args = process.argv.slice(2);
const removeOrphans = args.includes('--remove-orphans');
const removeDangling = args.includes('--remove-dangling');

async function main() {
  const logger = createSyncLogger();
  const abortController = new AbortController();

  await loggerStorage.run(logger, async () => {
    Sentry.withScope(async (scope) => {
      await sentryStorage.run(scope, async () => {
        await abortControllerStorage.run(abortController, async () => {
          try {
            logger.info('Starting file integrity check...');

            const result = await runFileIntegrityCheck({ removeOrphans, removeDangling });

            if (!removeOrphans && (result.orphanDbFiles > 0 || result.s3FilesWithoutDb > 0)) {
              logger.info('Run with --remove-orphans to clean up orphaned files.');
            }
            if (!removeDangling && result.dbFilesWithoutS3 > 0) {
              logger.info('Run with --remove-dangling to clean up DB records without S3 files.');
            }

            const hasIssues = result.orphanDbFiles > 0 || result.dbFilesWithoutS3 > 0 || result.s3FilesWithoutDb > 0;
            await prisma.$disconnect();
            process.exit(hasIssues ? 1 : 0);
          } catch (error) {
            logger.error({ err: error }, 'File integrity check failed');
            await prisma.$disconnect();
            process.exit(1);
          }
        });
      });
    });
  });
}

main();
