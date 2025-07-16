import type { PrismaClient } from 'generated/client';
import { seedAdministratives } from './add_seed_entities/seed_administratives';
import { seedDirections } from './add_seed_entities/seed_directions';
import { seedServices } from './add_seed_entities/seed_services';

export async function seedEntites(prisma: PrismaClient) {
  console.log('🌱 Début du seeding des entites...');
  const results: { table: string; added: number }[] = [];

  try {
    results.push(await seedAdministratives(prisma));
    results.push(await seedDirections(prisma));
    results.push(await seedServices(prisma));
  } catch (error) {
    console.error('❌ Erreur pendant le seeding des entites:', error);
    throw error;
  }

  for (const result of results) {
    console.log(`  ✅ ${result.table} : ${result.added} ajoutés`);
  }

  console.log('🎉 Seeding pour des entites terminé !');
}
