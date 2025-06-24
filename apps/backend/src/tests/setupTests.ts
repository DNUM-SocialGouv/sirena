import type { Context, Next } from 'hono';
import { vi } from 'vitest';

const fakeLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: () => fakeLogger,
};

vi.mock('@/middlewares/pino.middleware', () => {
  return {
    default: () => {
      return async (c: Context, next: () => Next) => {
        c.set('logger', fakeLogger);
        return next();
      };
    },
  };
});
