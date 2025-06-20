import { PrismaClient } from '../generated/client';
import { seed_super_admin } from './seed/add_default_super_admin';
import { seedEnums } from './seed/add_enums';

const prisma = new PrismaClient();

async function seeding() {
  await seedEnums(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding des enums', e);
    process.exit(1);
  });
  await seed_super_admin(prisma).catch((e) => {
    console.error('❌ Erreur lors du seeding des super admin:', e);
    process.exit(1);
  });
}
seeding().finally(async () => {
  await prisma.$disconnect();
});
