import { PrismaClient } from '../generated/client';
import { seedSuperAdmin } from './seed/add_default_super_admin';
import { seedDematSocialMapper } from './seed/add_demat_social_mapper';
import { seedEntites } from './seed/add_entities';
import { seedEnums } from './seed/add_enums';
import { seedRequeteFromDematSocial } from './seed/get_first_time_demat_social';

const prisma = new PrismaClient();

async function seeding() {
  await seedEnums(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding des enums', e);
    process.exit(1);
  });
  await seedSuperAdmin(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding des super admin:', e);
    process.exit(1);
  });
  await seedEntites(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding des entités:', e);
    process.exit(1);
  });
  await seedDematSocialMapper(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding du mapper Demat Social:', e);
    process.exit(1);
  });
  await seedRequeteFromDematSocial(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding des requêtes depuis Demat Social:', e);
    process.exit(1);
  });
}

seeding().finally(async () => {
  await prisma.$disconnect();
});
