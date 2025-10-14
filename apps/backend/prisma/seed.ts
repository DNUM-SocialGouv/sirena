import * as Sentry from '@sentry/node';
import { createDefaultLogger } from '@/helpers/pino';
import { loggerStorage, sentryStorage } from '@/libs/asyncLocalStorage';
import { PrismaClient } from '../generated/client';
import { seedSuperAdmin } from './seed/add_default_super_admin';
import { seedEntites } from './seed/add_entities';
import { seedEnums } from './seed/add_enums';
import { seedRequeteFromDematSocial } from './seed/get_demat_social';
import '@/libs/instrument';

async function main() {
  const prisma = new PrismaClient();

  const logger = createDefaultLogger();

  async function seeding() {
    await seedEnums(prisma).catch((e) => {
      logger.error('❌ Erreur lors du seeding des enums', e);
      process.exit(1);
    });
    await seedSuperAdmin(prisma).catch((e) => {
      logger.error('❌ Erreur lors du seeding des super admin:', e);
      process.exit(1);
    });
    await seedEntites(prisma).catch((e) => {
      logger.error('❌ Erreur lors du seeding des entités:', e);
      process.exit(1);
    });
    await seedRequeteFromDematSocial().catch((e) => {
      logger.error('❌ Erreur lors du seeding des requêtes depuis Demat Social:', e);
    });
  }

  loggerStorage.run(logger, () => {
    Sentry.withScope((scope) => {
      sentryStorage.run(scope, async () => {
        try {
          await seeding();
        } finally {
          await prisma.$disconnect();
        }
      });
    });
  });
}

main();
