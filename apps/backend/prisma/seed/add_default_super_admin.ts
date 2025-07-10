import type { PrismaClient } from 'generated/client';

export async function seedSuperAdmin(prisma: PrismaClient) {
  console.log('🌱 Début du seeding des super admin...');
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
      if (user.roleId !== superAdminId) {
        await prisma.user.update({
          where: { email: superAdminEmail },
          data: { roleId: superAdminId },
        });
        console.log(`👑 Rôle SUPER_ADMIN assigné à: ${superAdminEmail}`);
      }
    } else {
      console.log(`❌ Utilisateur non trouvé: ${superAdminEmail}`);
    }
  }

  console.log('🎉 Seeding des super admins terminé!');
}
