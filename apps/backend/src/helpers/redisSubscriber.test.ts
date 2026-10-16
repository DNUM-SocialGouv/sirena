import type { Redis } from 'ioredis';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeSubscriber, SUBSCRIBER_CLOSE_TIMEOUT_MS } from './redisSubscriber.js';

const CHANNEL = 'test:channel';

const createClient = (overrides: Partial<Record<'unsubscribe' | 'quit', () => Promise<unknown>>> = {}) => ({
  unsubscribe: vi.fn(overrides.unsubscribe ?? (() => Promise.resolve())),
  quit: vi.fn(overrides.quit ?? (() => Promise.resolve())),
  disconnect: vi.fn(),
});

const asRedis = (client: ReturnType<typeof createClient>) => client as unknown as Redis;

describe('closeSubscriber', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('unsubscribes then closes the connection', async () => {
    const client = createClient();

    await closeSubscriber(asRedis(client), CHANNEL);

    expect(client.unsubscribe).toHaveBeenCalledWith(CHANNEL);
    expect(client.quit).toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalled();
  });

  it.each([
    ['unsubscribe', { unsubscribe: () => new Promise<never>(() => {}) }],
    ['quit', { quit: () => new Promise<never>(() => {}) }],
  ])('gives up on a %s that never settles, and drops the socket', async (_name, overrides) => {
    // `maxRetriesPerRequest: null` keeps a command queued instead of failing it.
    const client = createClient(overrides);
    vi.useFakeTimers();

    const closed = closeSubscriber(asRedis(client), CHANNEL);
    const asserted = expect(closed).rejects.toThrow(/did not close within/);
    await vi.advanceTimersByTimeAsync(SUBSCRIBER_CLOSE_TIMEOUT_MS);
    await asserted;

    expect(client.disconnect).toHaveBeenCalled();
  });

  it('drops the socket when the graceful close rejects', async () => {
    const client = createClient({ unsubscribe: () => Promise.reject(new Error('ECONNRESET')) });

    await expect(closeSubscriber(asRedis(client), CHANNEL)).rejects.toThrow('ECONNRESET');

    expect(client.disconnect).toHaveBeenCalled();
  });
});
