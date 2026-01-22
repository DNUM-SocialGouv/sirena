import * as Sentry from '@sentry/node';
import { type Prisma, PrismaClient } from '../generated/client/index.js';
import { createDefaultLogger } from '../src/helpers/pino.js';
import { loggerStorage, prismaStorage, sentryStorage } from '../src/libs/asyncLocalStorage.js';
import { seedSuperAdmin } from './seed/add_default_super_admin.js';
import { seedEntites } from './seed/add_entities.js';
import { seedEnums } from './seed/add_enums.js';
import { seedRequeteFromDematSocial } from './seed/get_demat_social.js';
import { importGeoData } from './seed/importGeoData.js';
import '../src/libs/instrument.js';
import { connection as redisConnection } from '../src/config/redis.js';
import { prisma as appPrisma } from '../src/libs/prisma.js';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isVerbose = args.includes('--verbose');

  const prisma = new PrismaClient({
    log: isVerbose
      ? [
          {
            emit: 'event',
            level: 'query',
          },
          'info',
          'warn',
          'error',
        ]
      : ['info', 'warn', 'error'],
    transactionOptions: {
      timeout: 120000,
      maxWait: 20000,
    },
  });
  const logger = createDefaultLogger();

  if (isVerbose) {
    prisma.$on('query', (e: Prisma.QueryEvent) => {
      logger.info({ query: e.query, params: e.params, duration: e.duration }, '🔍 SQL Query');
    });
  }

  async function seeding(tx: Prisma.TransactionClient) {
    try {
      await seedEnums(tx);
    } catch (err) {
      logger.error({ err }, '❌ Erreur lors du seeding des enums');
      throw err;
    }
    try {
      await seedSuperAdmin(tx);
    } catch (err) {
      logger.error({ err }, '❌ Erreur lors du seeding du super admin');
      throw err;
    }
    try {
      await seedEntites(tx);
    } catch (err) {
      logger.error({ err }, '❌ Erreur lors du seeding des entités');
      throw err;
    }
    try {
      await importGeoData(tx);
    } catch (err) {
      logger.error({ err }, "❌ Erreur lors de l'importation des données géographiques");
      throw err;
    }

    try {
      await seedRequeteFromDematSocial();
    } catch (err) {
      logger.error({ err }, '❌ Erreur lors du seeding des requêtes depuis Demat Social');
    }
  }
  loggerStorage.run(logger, () => {
    Sentry.withScope((scope) => {
      sentryStorage.run(scope, async () => {
        try {
          await prisma.$transaction(
            async (tx) => {
              await prismaStorage.run(tx, async () => {
                await seeding(tx);
              });
              if (isDryRun) {
                throw new Error('Rollback for dry-run');
              }
            },
            {
              timeout: 120000,
              maxWait: 20000,
            },
          );
        } catch (error) {
          if (isDryRun && (error as Error).message === 'Rollback for dry-run') {
            logger.info('Dry-run completed successfully. Changes rolled back.');
          } else {
            throw error;
          }
        } finally {
          await redisConnection.quit();
          await prisma.$disconnect();
          await appPrisma.$disconnect();
        }
      });
    });
  });
}
main();
