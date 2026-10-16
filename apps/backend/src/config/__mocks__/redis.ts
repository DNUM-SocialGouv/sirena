import { type Mock, vi } from 'vitest';

// Test double of the shared Redis client: the real module connects to Redis as soon as it is imported.
export const connection: Record<'publish' | 'set' | 'duplicate', Mock> = {
  publish: vi.fn(async () => 1),
  set: vi.fn(async () => 'OK'),
  duplicate: vi.fn(),
};

export const sanitizeRedisError = (err: unknown): unknown => err;
