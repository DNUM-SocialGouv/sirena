import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';

export const prismaStorage = new AsyncLocalStorage<PrismaClient | Prisma.TransactionClient>();

export const getPrismaStore = () => {
  const prisma = prismaStorage.getStore();
  if (!prisma) {
    throw new Error('Prisma not found in AsyncLocalStorage');
  }
  return prisma;
};
