import * as Sentry from '@sentry/node';
import { connection as redisConnection } from '../config/redis.js';
import { backfillRequetesPrisesEnChargeToDematSocial } from '../features/dematSocial/closureSync/closureSyncBackfill.service.js';
import { createDefaultLogger } from '../helpers/pino.js';
import { abortControllerStorage, loggerStorage, sentryStorage } from '../libs/asyncLocalStorage.js';
import '../libs/instrument.js';
import { prisma } from '../libs/prisma.js';

async function main() {
  const logger = createDefaultLogger();
  const abortController = new AbortController();

  await loggerStorage.run(logger, async () => {
    Sentry.withScope(async (scope) => {
      await sentryStorage.run(scope, async () => {
        await abortControllerStorage.run(abortController, async () => {
          try {
            logger.info('🚀 Starting op:backfill:taken-over-requetes:dematsocial...');

            const result = await backfillRequetesPrisesEnChargeToDematSocial();

            logger.info(result, '✅ op:backfill:taken-over-requetes:dematsocial completed.');
          } catch (error) {
            logger.error({ err: error }, '❌ Error during op:backfill:taken-over-requetes:dematsocial');
            process.exit(1);
          } finally {
            await redisConnection.quit();
            await prisma.$disconnect();
          }
        });
      });
    });
  });
}

main();
