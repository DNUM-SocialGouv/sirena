import type { PrismaClient } from "generated/client";


export async function seed_super_admin(prisma: PrismaClient) {
  const superAdminRole = await prisma.role.findUnique({
    where: { roleName: 'SUPER_ADMIN' }
  });
  if(!superAdminRole) {throw new Error()}
  const superAdminId = superAdminRole.id
  
  console.log('🌱 Début du seeding des super admin...');
  const superAdmin = process.env.SUPER_ADMIN_LIST_EMAIL || ''
  const superAdminList = superAdmin.split(';')
  for (const superAdminEmail of superAdminList) {
    console.log(`🔍 Recherche de l'utilisateur: ${superAdminEmail}`);
    
    const user = await prisma.user.findUnique({
      where: { email: superAdminEmail }
    });
    
    if (user) {
      if (user.roleId !== superAdminId) {
        await prisma.user.update({
          where: { email: superAdminEmail },
          data: { roleId: superAdminId }
        });
        console.log(`👑 Rôle SUPER_ADMIN assigné à: ${superAdminEmail}`);
      } else {
        console.log(`!  ${superAdminEmail} a déjà le rôle SUPER_ADMIN`);
      }
    } else {
      console.log(`❌ Utilisateur non trouvé: ${superAdminEmail}`);
    }
  }
  
  console.log('🎉 Seeding des super admins terminé!');
}
