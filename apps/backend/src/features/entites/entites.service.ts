import { prisma } from '@/libs/prisma';

export const getEntiteForUser = async (organizationUnit: string | null, emails: string) => {
  if (organizationUnit) {
    const entites = await prisma.entite.findMany({
      where: {
        organizationUnit,
      },
    });

    if (entites.length === 1) {
      return entites[0];
    }
    return null;
  }

  if (emails) {
    for (const email of emails.split(',')) {
      const trimmedEmail = email.trim();
      if (trimmedEmail) {
        const entite = await prisma.entite.findMany({
          where: {
            emailDomain: trimmedEmail.split('@')[1],
          },
        });
        if (entite.length === 1) {
          return entite[0];
        }
      }
    }
  }
  return null;
};
