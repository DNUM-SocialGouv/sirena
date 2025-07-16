import type { PrismaClient } from 'generated/client';
import { importRequetes } from '@/features/dematSocial/dematSocial.service';

export async function seedRequeteFromDematSocial(prisma: PrismaClient) {
  const requetes = await prisma.requete.findMany();

  if (requetes.length > 0) {
    console.log('  ✅ Aucune requête à créer, le seeding est déjà effectué.');
    return;
  }
  console.log('🌱 Début du seeding des requetes via dematSocial...');
  await importRequetes();
  const count = await prisma.requete.count();

  console.log(`🎉 Seeding des requetes terminé! ${count} requete(s)`);
}
