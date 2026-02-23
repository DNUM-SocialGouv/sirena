import { prisma } from '../../libs/prisma.js';

export const findApiKeyByHash = (keyHash: string) =>
  prisma.apiKey.findUnique({
    where: { keyHash },
    include: { account: true },
  });

export const markApiKeyAsExpired = (id: string) =>
  prisma.apiKey.update({
    where: { id },
    data: { status: 'EXPIRED' },
  });

export const updateApiKeyLastUsedAt = (id: string) =>
  prisma.apiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
