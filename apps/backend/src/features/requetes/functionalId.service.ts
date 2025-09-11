import { prisma } from '@/libs/prisma';

export type FunctionalIdSource = 'SIRENA' | 'DEMAT_SOCIAL';

/**
 * Format: R[S ou D]-AAAA-MM-XXXX
 * RS = created via SIRENA
 * RD = created via DematSocial
 */
export async function generateRequeteId(source: FunctionalIdSource): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const startOfDay = new Date(Date.UTC(year, now.getMonth(), now.getDate()));
  const endOfDay = new Date(Date.UTC(year, now.getMonth(), now.getDate() + 1));

  const result = await prisma.$transaction(async (tx) => {
    const prefix = source === 'SIRENA' ? 'RS' : 'RD';
    const _pattern = `${prefix}-${year}-${month}-%`;

    const todayRequests = await tx.requete.findMany({
      where: {
        id: {
          startsWith: `${prefix}-${year}-${month}-`,
        },
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        id: 'desc',
      },
      take: 1,
    });

    let nextNumber = 1;

    if (todayRequests.length > 0) {
      const lastId = todayRequests[0].id;
      const parts = lastId.split('-');
      const lastNumber = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}-${year}-${month}-${nextNumber}`;
  });

  return result;
}

export function determineSource(dematSocialId: number | null | undefined): FunctionalIdSource {
  return dematSocialId ? 'DEMAT_SOCIAL' : 'SIRENA';
}
