import * as Sentry from '@sentry/node';
import { createDefaultLogger } from '@/helpers/pino';
import { loggerStorage, sentryStorage } from '@/libs/asyncLocalStorage';
import { PrismaClient } from '../generated/client';
import { seedSuperAdmin } from './seed/add_default_super_admin';
import { seedEntites } from './seed/add_entities';
import { seedEnums } from './seed/add_enums';
import { seedRequeteFromDematSocial } from './seed/get_demat_social';
import { importGeoData } from './seed/importGeoData';
import '@/libs/instrument';
import { connection as redisConnection } from '@/config/redis';
import { prisma as appPrisma } from '@/libs/prisma';

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
