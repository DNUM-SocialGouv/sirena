import { type Prisma, prisma } from '../../libs/prisma.js';

export type FunctionalIdSource = 'SIRENA' | 'DEMAT_SOCIAL';

/**
 * Format: AAAA-MM-R[S ou D]N
 * RS = created via SIRENA
 * RD = created via DematSocial
 */
export async function generateRequeteId(source: FunctionalIdSource, tx?: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const sourcePrefix = source === 'SIRENA' ? 'RS' : 'RD';
  const monthPrefix = `${year}-${month}-${sourcePrefix}`;

  const prismaClient = tx || prisma;

  const count = await prismaClient.requete.count({
    where: {
      id: {
        startsWith: monthPrefix,
      },
    },
  });

  const nextNumber = count + 1;

  return `${year}-${month}-${sourcePrefix}${nextNumber}`;
}

export function determineSource(dematSocialId: number | null | undefined): FunctionalIdSource {
  return dematSocialId ? 'DEMAT_SOCIAL' : 'SIRENA';
}
