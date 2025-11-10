import { type Prisma, prisma } from '@/libs/prisma';

export type FunctionalIdSource = 'SIRENA' | 'DEMAT_SOCIAL';

/**
 * Format: R[S ou D]-AAAA-MM-XXXX
 * RS = created via SIRENA
 * RD = created via DematSocial
 */
export async function generateRequeteId(source: FunctionalIdSource, tx?: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const prefix = source === 'SIRENA' ? 'RS' : 'RD';
  const monthPrefix = `${prefix}-${year}-${month}-`;

  const prismaClient = tx || prisma;

  const count = await prismaClient.requete.count({
    where: {
      id: {
        startsWith: monthPrefix,
      },
    },
  });

  const nextNumber = count + 1;

  return `${prefix}-${year}-${month}-${nextNumber}`;
}

export function determineSource(dematSocialId: number | null | undefined): FunctionalIdSource {
  return dematSocialId ? 'DEMAT_SOCIAL' : 'SIRENA';
}
