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

  const result = await prisma.$transaction(
    async (tx) => {
      const prefix = source === 'SIRENA' ? 'RS' : 'RD';
      const monthPrefix = `${prefix}-${year}-${month}-`;

      const lastRequestOfMonth = await tx.requete.findFirst({
        where: {
          id: {
            startsWith: monthPrefix,
          },
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      let nextNumber = 1;

      if (lastRequestOfMonth) {
        const allRequests = await tx.requete.findMany({
          where: {
            id: {
              startsWith: monthPrefix,
            },
          },
          select: {
            id: true,
          },
        });

        let maxNumber = 0;
        for (const req of allRequests) {
          const parts = req.id.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!Number.isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }

        nextNumber = maxNumber + 1;
      }

      return `${prefix}-${year}-${month}-${nextNumber}`;
    },
    {
      isolationLevel: 'Serializable',
    },
  );

  return result;
}

export function determineSource(dematSocialId: number | null | undefined): FunctionalIdSource {
  return dematSocialId ? 'DEMAT_SOCIAL' : 'SIRENA';
}
