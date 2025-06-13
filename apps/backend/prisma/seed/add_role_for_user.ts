import { roles } from '@sirena/common/constants';
import type { PrismaClient } from 'generated/client';

export async function seed_role_for_user(prisma: PrismaClient) {
  console.log('🌱 Début du seeding des rôles...');

  for (const [roleName, description] of Object.entries(roles)) {
    const existingRole = await prisma.roleEnum.findUnique({
      where: { roleName },
    });

    if (!existingRole) {
      await prisma.roleEnum.create({
        data: {
          roleName,
          description,
        },
      });
      console.log(`✅ Rôle créé: ${roleName} - ${description}`);
    } else {
      console.log(`!  Rôle déjà existant: ${roleName}`);
    }
  }

  const pendingRole = await prisma.roleEnum.findUnique({
    where: { roleName: 'PENDING' },
  });

  if (pendingRole) {
    const usersWithoutRole = await prisma.user.findMany({
      where: { roleId: null },
    });

    console.log(`📋 ${usersWithoutRole.length} utilisateur(s) trouvé(s) sans rôle assigné`);

    if (usersWithoutRole.length > 0) {
      await prisma.user.updateMany({
        where: { roleId: null },
        data: { roleId: pendingRole.id },
      });
      console.log(`✅ Rôle PENDING assigné à ${usersWithoutRole.length} utilisateur(s)`);
    }
  } else {
    console.log('❌ Rôle PENDING non trouvé');
  }

  console.log('🎉 Seeding des rôles terminé!');
}
