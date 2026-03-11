import { connection } from '../../config/redis.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { type Prisma, prisma } from '../../libs/prisma.js';

export type FunctionalIdSource = 'SIRENA' | 'TELEPHONIQUE' | 'FORMULAIRE';

const SOURCE_PREFIX: Record<FunctionalIdSource, string> = {
  SIRENA: 'RS',
  TELEPHONIQUE: 'RT',
  FORMULAIRE: 'RF',
};

const ID_LOCK_TTL_SECONDS = 10;
const MAX_LOCK_ATTEMPTS = 100;

const getRequeteIdLockKey = (id: string) => `requete:id-lock:${id}`;

/**
 * Format: AAAA-MM-R[X]N
 * RS = created via SIRENA
 * RT = created via Telephonique
 * RF = created via Formulaire
 */
export async function generateRequeteId(source: FunctionalIdSource, tx?: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const sourcePrefix = SOURCE_PREFIX[source];
  const monthPrefix = `${year}-${month}-${sourcePrefix}`;
  const regexPattern = `^${monthPrefix}[0-9]+$`;

  const prismaClient = tx || prisma;

  const [result] = await prismaClient.$queryRaw<{ maxNumber: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING(id FROM ${monthPrefix.length + 1}::int) AS INTEGER)) AS "maxNumber"
    FROM "Requete"
    WHERE id LIKE ${`${monthPrefix}%`}
      AND id ~ ${regexPattern}
  `;

  let nextNumber = (result?.maxNumber ?? 0) + 1;

  for (let attempt = 0; attempt < MAX_LOCK_ATTEMPTS; attempt++) {
    const id = `${year}-${month}-${sourcePrefix}${nextNumber}`;
    const lockResult = await connection.set(getRequeteIdLockKey(id), '1', 'EX', ID_LOCK_TTL_SECONDS, 'NX');

    if (lockResult === 'OK') {
      return id;
    }

    nextNumber++;
  }

  const logger = getLoggerStore();
  logger.error(
    {
      source,
      monthPrefix,
      maxLockAttempts: MAX_LOCK_ATTEMPTS,
      lockTtlSeconds: ID_LOCK_TTL_SECONDS,
    },
    'Unable to reserve requete id lock',
  );

  throw new Error(`Unable to reserve requete id after ${MAX_LOCK_ATTEMPTS} attempts for prefix ${monthPrefix}`);
}

export function determineSource(dematSocialId: number | null | undefined): FunctionalIdSource {
  return dematSocialId ? 'FORMULAIRE' : 'SIRENA';
}
