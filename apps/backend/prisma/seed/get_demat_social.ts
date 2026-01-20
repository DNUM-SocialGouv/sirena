import { importRequetes } from '../../src/features/dematSocial/dematSocial.service.js';
import { getLoggerStore } from '../../src/libs/asyncLocalStorage.js';

export async function seedRequeteFromDematSocial() {
  const logger = getLoggerStore();
  logger.info('🌱 Début du seeding des requetes via dematSocial...');

  await importRequetes();

  logger.info(`🎉 Seeding des requetes terminé!`);
}
