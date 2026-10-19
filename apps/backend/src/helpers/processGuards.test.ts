import * as Sentry from '@sentry/node';
import type { Logger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeQuietly, installProcessGuards } from './processGuards.js';

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
}));

const FATAL_EVENTS = ['uncaughtException', 'unhandledRejection'] as const;

const createLogger = () =>
  ({ fatal: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }) as unknown as Logger & {
    fatal: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

const flushAsyncWork = () => new Promise((resolve) => setImmediate(resolve));

describe('processGuards.ts', () => {
  // The guards register on the process itself, so isolate them from vitest's own listeners.
  let saved: {
    uncaughtException: NodeJS.UncaughtExceptionListener[];
    unhandledRejection: NodeJS.UnhandledRejectionListener[];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    saved = {
      uncaughtException: process.listeners('uncaughtException'),
      unhandledRejection: process.listeners('unhandledRejection'),
    };
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
  });

  afterEach(() => {
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    for (const listener of saved.uncaughtException) {
      process.on('uncaughtException', listener);
    }
    for (const listener of saved.unhandledRejection) {
      process.on('unhandledRejection', listener);
    }
  });

  describe('installProcessGuards', () => {
    it.each(FATAL_EVENTS)('logs, reports to Sentry and shuts down on %s', async (event) => {
      const logger = createLogger();
      const onFatal = vi.fn();
      const err = new Error('boom');

      installProcessGuards({ logger, onFatal });
      process.emit(event, err as never);
      await flushAsyncWork();

      expect(logger.fatal).toHaveBeenCalledWith({ err, event }, `Fatal error: ${event}`);
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
      expect(onFatal).toHaveBeenCalledWith(event);
    });

    it('shuts down only once, so a cascading error does not mask the first cause', async () => {
      const logger = createLogger();
      const onFatal = vi.fn();

      installProcessGuards({ logger, onFatal });
      process.emit('uncaughtException', new Error('first') as never);
      process.emit('uncaughtException', new Error('second') as never);
      await flushAsyncWork();

      expect(onFatal).toHaveBeenCalledTimes(1);
      expect(logger.fatal).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'uncaughtException' }),
        'Additional fatal error while shutting down',
      );
    });

    it('still shuts down when Sentry cannot flush', async () => {
      const logger = createLogger();
      const onFatal = vi.fn();
      vi.mocked(Sentry.flush).mockRejectedValueOnce(new Error('sentry down'));

      installProcessGuards({ logger, onFatal });
      process.emit('uncaughtException', new Error('boom') as never);
      await flushAsyncWork();

      expect(onFatal).toHaveBeenCalledWith('uncaughtException');
    });
  });

  describe('closeQuietly', () => {
    it('logs the successful close', async () => {
      const logger = createLogger();

      await closeQuietly('Redis client', logger, () => Promise.resolve());

      expect(logger.info).toHaveBeenCalledWith('Redis client closed');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('swallows a close failure so the shutdown stays a clean exit', async () => {
      const logger = createLogger();
      const err = new Error('connection already gone');

      await expect(closeQuietly('Redis client', logger, () => Promise.reject(err))).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith({ err }, 'Failed to close Redis client, continuing shutdown');
    });
  });
});
