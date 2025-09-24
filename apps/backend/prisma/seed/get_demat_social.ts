import { importRequetes } from '@/features/dematSocial/dematSocial.service';
import { getLoggerStore } from '@/libs/asyncLocalStorage';

export async function seedRequeteFromDematSocial() {
  const logger = getLoggerStore();
  logger.info('🌱 Début du seeding des requetes via dematSocial...');

  await importRequetes();

  logger.info(`🎉 Seeding des requetes terminé!`);
}
