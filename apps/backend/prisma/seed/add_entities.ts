import type { PrismaClient } from 'generated/client';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import { seedAdministratives } from './add_seed_entities/seed_administratives';
import { seedDirections } from './add_seed_entities/seed_directions';
import { seedServices } from './add_seed_entities/seed_services';

export async function seedEntites(prisma: PrismaClient) {
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
