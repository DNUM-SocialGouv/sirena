import type { Scope } from '@sentry/node';
import { describe, expect, it, vi } from 'vitest';
import type { createDefaultLogger } from '@/helpers/pino';
import { createDefaultLogger as createLogger } from '@/helpers/pino';
import { getLoggerStore, getSentryStore, loggerStorage, sentryStorage } from './asyncLocalStorage';

// Create a mock Scope class for testing
class MockScope {
  setContext = vi.fn();
  setUser = vi.fn();
  setTag = vi.fn();
  setExtra = vi.fn();
}

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
    it('should store and retrieve Sentry scope', async () => {
      let retrievedScope: Scope | undefined;
      const mockScope = new MockScope() as unknown as Scope;

      await sentryStorage.run(mockScope, async () => {
        retrievedScope = getSentryStore();
      });

      expect(retrievedScope).toBe(mockScope);
    });

    it('should throw error when no Sentry in context', () => {
      expect(() => getSentryStore()).toThrow('Sentry not found in AsyncLocalStorage');
    });
  });

  describe('nested contexts', () => {
    it('should work with nested logger and Sentry contexts', async () => {
      const logger = createLogger();
      const mockScope = new MockScope() as unknown as Scope;
      let retrievedLogger: ReturnType<typeof createDefaultLogger> | undefined;
      let retrievedScope: Scope | undefined;

      await loggerStorage.run(logger, async () => {
        await sentryStorage.run(mockScope, async () => {
          retrievedLogger = getLoggerStore();
          retrievedScope = getSentryStore();
        });
      });

      expect(retrievedLogger).toBe(logger);
      expect(retrievedScope).toBe(mockScope);
    });

    it('should work with reversed nesting order', async () => {
      const logger = createLogger();
      const mockScope = new MockScope() as unknown as Scope;
      let retrievedLogger: ReturnType<typeof createDefaultLogger> | undefined;
      let retrievedScope: Scope | undefined;

      await sentryStorage.run(mockScope, async () => {
        await loggerStorage.run(logger, async () => {
          retrievedLogger = getLoggerStore();
          retrievedScope = getSentryStore();
        });
      });

      expect(retrievedLogger).toBe(logger);
      expect(retrievedScope).toBe(mockScope);
    });
  });
});
