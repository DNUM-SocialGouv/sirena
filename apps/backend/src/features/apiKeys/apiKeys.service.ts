import { type ApiKey, type Prisma, prisma } from '../../libs/prisma.js';

export const findApiKeyByHash = (
  keyHash: string,
): Promise<Prisma.ApiKeyGetPayload<{ include: { account: true } }> | null> =>
  prisma.apiKey.findUnique({
    where: { keyHash },
    include: { account: true },
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
