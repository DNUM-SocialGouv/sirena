import type { PrismaClient } from 'generated/client';
import dematSocialMapper from '@/features/dematSocial/dematSocial.mapper';

export async function seedDematSocialMapper(prisma: PrismaClient) {
  console.log('🌱 Début du seeding du mapper Demat Social...');
  await prisma.dematSocialMapping.deleteMany();

  const mappers = Object.entries(dematSocialMapper).map(([key, value]) => ({
    key,
    dematSocialId: value.id,
    label: value.label,
    comment: '',
  }));

  for (const mapper of mappers) {
    const existingMapper = await prisma.dematSocialMapping.findUnique({
      where: { dematSocialId: mapper.dematSocialId },
    });

    if (!existingMapper) {
      await prisma.dematSocialMapping.create({
        data: mapper,
      });
    }
  }

  console.log('🎉 Seeding du mapper Demat Social terminé!');
}
