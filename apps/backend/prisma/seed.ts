import * as Sentry from '@sentry/node';
import { PrismaClient } from '../generated/client/index.js';
import { createDefaultLogger } from '../src/helpers/pino.js';
import { loggerStorage, sentryStorage } from '../src/libs/asyncLocalStorage.js';
import { seedSuperAdmin } from './seed/add_default_super_admin.js';
import { seedEntites } from './seed/add_entities.js';
import { seedEnums } from './seed/add_enums.js';
import { seedRequeteFromDematSocial } from './seed/get_demat_social.js';
import { importGeoData } from './seed/importGeoData.js';
import '../src/libs/instrument.js';
import { connection as redisConnection } from '../src/config/redis.js';
import { prisma as appPrisma } from '../src/libs/prisma.js';

async function main() {
  const prisma = new PrismaClient({
    transactionOptions: {
      timeout: 120000,
      maxWait: 20000,
    },
  });
  const logger = createDefaultLogger();
  async function seeding() {
    try {
      await seedEnums(prisma);
    } catch (err) {
      logger.error({ err }, '❌ Erreur lors du seeding des enums');
      throw err;
    }
    try {
      await seedSuperAdmin(prisma);
    } catch (err) {
      logger.error({ err }, '❌ Erreur lors du seeding du super admin');
      throw err;
    }
    try {
      await seedEntites(prisma);
    } catch (err) {
      logger.error({ err }, '❌ Erreur lors du seeding des entités');
      throw err;
    }
    try {
      await importGeoData(prisma);
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
          await seeding();
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
