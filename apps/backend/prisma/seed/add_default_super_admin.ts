import { STATUT_TYPES } from '@sirena/common/constants';
import type { PrismaClient } from 'generated/client';
import { getLoggerStore } from '@/libs/asyncLocalStorage';

export async function seedSuperAdmin(prisma: PrismaClient) {
  const logger = getLoggerStore();
  logger.info('🌱 Début du seeding des super admin...');
  const superAdminRole = await prisma.roleEnum.findUnique({
    where: { id: 'SUPER_ADMIN' },
  });
  if (!superAdminRole) {
    throw new Error("❌ Rôle SUPER_ADMIN non trouvé. Veuillez d'abord créer le rôle SUPER_ADMIN.");
  }
  const superAdminId = superAdminRole.id;
  const superAdmin = process.env.SUPER_ADMIN_LIST_EMAIL || '';
  const superAdminList = superAdmin.split(';');
  for (const superAdminEmail of superAdminList) {
    const user = await prisma.user.findUnique({
      where: { email: superAdminEmail },
    });

    if (user) {
      if (user.roleId !== superAdminId || user.statutId !== STATUT_TYPES.ACTIF) {
        await prisma.user.update({
          where: { email: superAdminEmail },
          data: { roleId: superAdminId, statutId: STATUT_TYPES.ACTIF },
        });
        logger.info({}, `  👑 Rôle SUPER_ADMIN assigné à: ${superAdminEmail}`);
      }
    } else {
      logger.info({}, `  ❌ Utilisateur non trouvé: ${superAdminEmail}`);
    }
  }

  logger.info('🎉 Seeding des super admins terminé!');
}
