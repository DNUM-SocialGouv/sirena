import { type ApiKey, type Prisma, prisma } from '../../libs/prisma.js';

/** Every record a presented key could match, so one read is enough to decide. */
export const findApiKeysByPrefix = (
  keyPrefix: string,
): Promise<Prisma.ApiKeyGetPayload<{ include: { account: true } }>[]> =>
  prisma.apiKey.findMany({
    where: { keyPrefix },
    include: { account: true },
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
