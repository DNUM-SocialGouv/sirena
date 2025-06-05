import type { PrismaClient } from "generated/client";

const roles = [
  {
    roleName: 'PENDING',
    description: 'En attente d\'affectation (rôle technique)'
  },
  {
    roleName: 'READER',
    description: 'Agent en lecture'
  },
  {
    roleName: 'WRITER',
    description: 'Agent en écriture'
  },
  {
    roleName: 'NATIONAL_STEERING',
    description: 'Pilotage national'
  },
  {
    roleName: 'ENTITY_ADMIN',
    description: 'Admin local'
  },
  {
    roleName: 'SUPER_ADMIN',
    description: 'Super administrateur'
  }
];

export async function seed_role_for_user(prisma: PrismaClient) {
  console.log('🌱 Début du seeding des rôles...');

  for (const role of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { roleName: role.roleName }
    });

    if (!existingRole) {
      await prisma.role.create({
        data: {
          roleName: role.roleName,
          description: role.description
        }
      });
      console.log(`✅ Rôle créé: ${role.roleName} - ${role.description}`);
    } else {
      console.log(`!  Rôle déjà existant: ${role.roleName}`);
    }
  }

  console.log('🎉 Seeding des rôles terminé!');
}
