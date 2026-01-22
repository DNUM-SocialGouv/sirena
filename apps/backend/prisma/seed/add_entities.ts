import type { Prisma, PrismaClient } from '../../generated/client/index.js';
import { getLoggerStore } from '../../src/libs/asyncLocalStorage.js';
import { seedAdministratives } from './add_seed_entities/seed_administratives.js';
import { seedDirections } from './add_seed_entities/seed_directions.js';
import { seedServices } from './add_seed_entities/seed_services.js';

export async function seedEntites(prisma: PrismaClient | Prisma.TransactionClient) {
  const logger = getLoggerStore();
  logger.info('🌱 Début du seeding des entites...');
  const results: { table: string; added: number }[] = [];

  try {
    results.push(await seedAdministratives(prisma));
    results.push(await seedDirections(prisma));
    results.push(await seedServices(prisma));
  } catch (err) {
    logger.error({ err }, '❌ Erreur pendant le seeding des entites:');
    throw err;
  }

  for (const result of results) {
    logger.info(`  ✅ ${result.table} : ${result.added} ajoutés`);
  }

  logger.info('🎉 Seeding pour des entites terminé !');
}
