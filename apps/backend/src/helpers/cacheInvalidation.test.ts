import { beforeEach, describe, expect, it, vi } from 'vitest';

const subscriberHandlers: Record<string, (channel: string, message: string) => void> = {};
const subscriber = {
  on: vi.fn((event: string, handler: (channel: string, message: string) => void) => {
    subscriberHandlers[event] = handler;
  }),
  subscribe: vi.fn(() => Promise.resolve()),
  unsubscribe: vi.fn(() => Promise.resolve()),
  quit: vi.fn(() => Promise.resolve()),
};
const publish = vi.fn(() => Promise.resolve(1));

vi.mock('../config/redis.js', () => ({
  connection: { duplicate: () => subscriber, publish: (...args: unknown[]) => publish(...(args as [])) },
  sanitizeRedisError: (error: unknown) => error,
}));

vi.mock('./pino.js', () => ({
  createDefaultLogger: () => ({ child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) }),
}));

const { CACHE_INVALIDATION_SCOPES, cacheInvalidationBus } = await import('./cacheInvalidation.js');
const { CACHE_INVALIDATION_CHANNEL, startCacheInvalidationSubscriber, stopCacheInvalidationSubscriber } = await import(
  './cacheInvalidation.redis.js'
);

const SCOPE = CACHE_INVALIDATION_SCOPES.ENTITES_PERIMETRE;

const receiveFromRedis = (message: string) => subscriberHandlers.message?.(CACHE_INVALIDATION_CHANNEL, message);

describe('cacheInvalidationBus', () => {
  let handler: () => void;

  beforeEach(async () => {
    await stopCacheInvalidationSubscriber();
    vi.clearAllMocks();
    handler = vi.fn<() => void>();
    cacheInvalidationBus.register(SCOPE, handler);
  });

  it('clears the local caches even when no transport is wired', () => {
    cacheInvalidationBus.invalidate(SCOPE);

    expect(vi.mocked(handler)).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });

  it('broadcasts the invalidation to the other instances once subscribed', async () => {
    await startCacheInvalidationSubscriber();

    cacheInvalidationBus.invalidate(SCOPE);

    expect(vi.mocked(handler)).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(CACHE_INVALIDATION_CHANNEL, JSON.stringify({ scope: SCOPE }));
  });

  it('subscribes to the invalidation channel', async () => {
    await startCacheInvalidationSubscriber();

    expect(subscriber.subscribe).toHaveBeenCalledWith(CACHE_INVALIDATION_CHANNEL);
  });

  it('clears the local caches when another instance broadcasts an invalidation', async () => {
    await startCacheInvalidationSubscriber();

    receiveFromRedis(JSON.stringify({ scope: SCOPE }));

    expect(vi.mocked(handler)).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown scope', JSON.stringify({ scope: 'entites:unknown' })],
    ['a malformed payload', 'not-json'],
  ])('ignores %s', async (_name, message) => {
    await startCacheInvalidationSubscriber();

    receiveFromRedis(message);

    expect(vi.mocked(handler)).not.toHaveBeenCalled();
  });

  it('stops broadcasting once the subscriber is closed', async () => {
    await startCacheInvalidationSubscriber();
    await stopCacheInvalidationSubscriber();

    cacheInvalidationBus.invalidate(SCOPE);

    expect(subscriber.unsubscribe).toHaveBeenCalledWith(CACHE_INVALIDATION_CHANNEL);
    expect(subscriber.quit).toHaveBeenCalled();
    expect(vi.mocked(handler)).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });
});
