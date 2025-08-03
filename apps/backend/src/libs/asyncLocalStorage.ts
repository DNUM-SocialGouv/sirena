import { AsyncLocalStorage } from 'node:async_hooks';
import type * as Sentry from '@sentry/node';
import type { createDefaultLogger } from '@/helpers/pino';

export const abortControllerStorage = new AsyncLocalStorage<AbortController>();

export const loggerStorage = new AsyncLocalStorage<ReturnType<typeof createDefaultLogger>>();

export const sentryStorage = new AsyncLocalStorage<typeof Sentry>();

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
