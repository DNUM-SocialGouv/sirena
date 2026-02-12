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
  const regexPattern = `^${monthPrefix}[0-9]+$`;

  const prismaClient = tx || prisma;

  const [result] = await prismaClient.$queryRaw<{ maxNumber: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING(id FROM ${monthPrefix.length + 1}::int) AS INTEGER)) AS "maxNumber"
    FROM "Requete"
    WHERE id LIKE ${`${monthPrefix}%`}
      AND id ~ ${regexPattern}
  `;

  const nextNumber = (result?.maxNumber ?? 0) + 1;

  return `${year}-${month}-${sourcePrefix}${nextNumber}`;
}

export function determineSource(dematSocialId: number | null | undefined): FunctionalIdSource {
  return dematSocialId ? 'DEMAT_SOCIAL' : 'SIRENA';
}
