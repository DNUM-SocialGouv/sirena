import { API_KEY_HASH_PREFIX } from '../../libs/apiKey.js';
import { type ApiKey, type Prisma, prisma } from '../../libs/prisma.js';

export const findApiKeyByHash = (
  keyHash: string,
): Promise<Prisma.ApiKeyGetPayload<{ include: { account: true } }> | null> =>
  prisma.apiKey.findUnique({
    where: { keyHash },
    include: { account: true },
  });

/** Keys still hashed with the legacy scrypt scheme; at zero the scrypt fallback is skipped entirely. */
export const countLegacyApiKeyHashes = (): Promise<number> =>
  prisma.apiKey.count({
    where: { NOT: { keyHash: { startsWith: API_KEY_HASH_PREFIX } } },
  });

export const updateApiKeyHash = (id: string, keyHash: string): Promise<ApiKey> =>
  prisma.apiKey.update({
    where: { id },
    data: { keyHash },
  });

export const markApiKeyAsExpired = (id: string): Promise<ApiKey> =>
  prisma.apiKey.update({
    where: { id },
    data: { status: 'EXPIRED' },
  });

export const updateApiKeyLastUsedAt = (id: string): Promise<ApiKey> =>
  prisma.apiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
