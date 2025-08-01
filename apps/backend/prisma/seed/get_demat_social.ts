import { importRequetes } from '@/features/dematSocial/dematSocial.service';

export async function seedRequeteFromDematSocial() {
  console.log('🌱 Début du seeding des requetes via dematSocial...');
  await importRequetes();

  console.log(`🎉 Seeding des requetes terminé!`);
}
