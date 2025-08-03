import * as Sentry from '@sentry/node';
import { describe, expect, it } from 'vitest';
import type { createDefaultLogger } from '@/helpers/pino';
import { createDefaultLogger as createLogger } from '@/helpers/pino';
import { getLoggerStore, getSentryStore, loggerStorage, sentryStorage } from './asyncLocalStorage';

describe('asyncLocalStorage', () => {
  describe('loggerStorage', () => {
    it('should store and retrieve logger', async () => {
      const logger = createLogger();
      let retrievedLogger: ReturnType<typeof createDefaultLogger> | undefined;

      await loggerStorage.run(logger, async () => {
        retrievedLogger = getLoggerStore();
      });

      expect(retrievedLogger).toBe(logger);
    });

    it('should throw error when no logger in context', () => {
      expect(() => getLoggerStore()).toThrow('Logger not found in AsyncLocalStorage');
    });
  });

  describe('sentryStorage', () => {
    it('should store and retrieve Sentry', async () => {
      let retrievedSentry: typeof Sentry | undefined;

      await sentryStorage.run(Sentry, async () => {
        retrievedSentry = getSentryStore();
      });

      expect(retrievedSentry).toBe(Sentry);
    });

    it('should throw error when no Sentry in context', () => {
      expect(() => getSentryStore()).toThrow('Sentry not found in AsyncLocalStorage');
    });
  });

  describe('nested contexts', () => {
    it('should work with nested logger and Sentry contexts', async () => {
      const logger = createLogger();
      let retrievedLogger: ReturnType<typeof createDefaultLogger> | undefined;
      let retrievedSentry: typeof Sentry | undefined;

      await loggerStorage.run(logger, async () => {
        await sentryStorage.run(Sentry, async () => {
          retrievedLogger = getLoggerStore();
          retrievedSentry = getSentryStore();
        });
      });

      expect(retrievedLogger).toBe(logger);
      expect(retrievedSentry).toBe(Sentry);
    });

    it('should work with reversed nesting order', async () => {
      const logger = createLogger();
      let retrievedLogger: ReturnType<typeof createDefaultLogger> | undefined;
      let retrievedSentry: typeof Sentry | undefined;

      await sentryStorage.run(Sentry, async () => {
        await loggerStorage.run(logger, async () => {
          retrievedLogger = getLoggerStore();
          retrievedSentry = getSentryStore();
        });
      });

      expect(retrievedLogger).toBe(logger);
      expect(retrievedSentry).toBe(Sentry);
    });
  });
});
