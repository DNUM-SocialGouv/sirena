import { importRequetes } from '@/features/dematSocial/dematSocial.service';
import { prisma } from '@/libs/prisma';

export async function seedRequeteFromDematSocial() {
  console.log('🌱 Début du seeding des requetes via dematSocial...');

  // Get a default entity for seeding
  const defaultEntity = await prisma.entite.findFirst({
    where: {
      label: 'ARS NORM', // ARS Normandie
    },
    select: { id: true, nomComplet: true },
  });

  if (!defaultEntity) {
    console.log('⚠️  Aucune entité trouvée. Les requêtes ne peuvent pas être importées sans entité.');
    return;
  }

  console.log(`📌 Utilisation de l'entité par défaut: ${defaultEntity.nomComplet}`);
  await importRequetes(undefined, defaultEntity.id);

  console.log(`🎉 Seeding des requetes terminé!`);
}
