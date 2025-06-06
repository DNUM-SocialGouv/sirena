import { seed_role_for_user } from './seed/20250604151013_add_role_for_user'
import { PrismaClient } from '../generated/client';
import {seed_super_admin} from "./seed/20250605151013_add_default_super_admin";

const prisma = new PrismaClient();
async function seeding (client: PrismaClient) {
    await seed_role_for_user(prisma)
        .catch((e) => {
            console.error('❌ Erreur lors du seeding des rôles:', e);
            process.exit(1);
        })
    await seed_super_admin(prisma)
        .catch((e) => {
            console.error('❌ Erreur lors du seeding des super admin:', e);
            process.exit(1);
        })
}
seeding(prisma)
    .finally(async () => {
        await prisma.$disconnect();
    });
