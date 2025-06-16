import { PrismaClient } from '../generated/client';
import { seed_super_admin } from './seed/add_default_super_admin';
import { seed_enums_for_requete } from './seed/add_enums_for_requete';
import { seed_role_for_user } from './seed/add_role_for_user';

const prisma = new PrismaClient();

async function seeding() {
  await seed_role_for_user(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding des rôles:', e);
    process.exit(1);
  });
  await seed_super_admin(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding des super admin:', e);
    process.exit(1);
  });
  await seed_enums_for_requete(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding pour les requetes:', e);
    process.exit(1);
  });
}
seeding().finally(async () => {
  await prisma.$disconnect();
});
