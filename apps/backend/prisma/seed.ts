import { seed_role_for_user } from './seed/20250604151013_add_role_for_user'
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

seed_role_for_user(prisma)
    .catch((e) => {
        console.error('❌ Erreur lors du seeding des rôles:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
