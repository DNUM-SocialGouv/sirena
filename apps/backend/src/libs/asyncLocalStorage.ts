import { AsyncLocalStorage } from 'node:async_hooks';
import type { Scope } from '@sentry/node';
import type { Prisma, PrismaClient } from '../../generated/client/index.js';
import type { createDefaultLogger } from '../helpers/pino.js';

export const abortControllerStorage = new AsyncLocalStorage<AbortController>();

export const loggerStorage = new AsyncLocalStorage<ReturnType<typeof createDefaultLogger>>();

export const sentryStorage = new AsyncLocalStorage<Scope>();

export const prismaStorage = new AsyncLocalStorage<PrismaClient | Prisma.TransactionClient>();

export const getLoggerStore = () => {
  const logger = loggerStorage.getStore();
  if (!logger) {
    throw new Error('Logger not found in AsyncLocalStorage');
  }
  return logger;
};

export const getSentryStore = () => {
  const sentry = sentryStorage.getStore();
  if (!sentry) {
    throw new Error('Sentry not found in AsyncLocalStorage');
  }
  return sentry;
};

export const getPrismaStore = () => {
  const prisma = prismaStorage.getStore();
  if (!prisma) {
    throw new Error('Prisma not found in AsyncLocalStorage');
  }
  return prisma;
};
