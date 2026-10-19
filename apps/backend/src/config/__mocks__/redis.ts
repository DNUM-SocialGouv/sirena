import type { Redis } from 'ioredis';
import { vi } from 'vitest';

export { sanitizeRedisError } from '../redis.sanitize.js';

// Test double of the shared Redis client: the real module connects to Redis as soon as it is imported.
// The listed methods follow the call sites of `connection` in the application code.
export const connection = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => 'OK'),
  setex: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
  incr: vi.fn(async () => 1),
  expire: vi.fn(async () => 1),
  publish: vi.fn(async () => 1),
  duplicate: vi.fn(),
  quit: vi.fn(async () => 'OK'),
} as unknown as Redis;
