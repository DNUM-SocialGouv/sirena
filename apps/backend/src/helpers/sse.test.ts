import type { SSEEventType } from '@sirena/common/constants';
import type { Context } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisHandlers: Record<string, (channel: string, message: string) => void> = {};
const subscriber = {
  on: vi.fn((event: string, handler: (channel: string, message: string) => void) => {
    redisHandlers[event] = handler;
  }),
  subscribe: vi.fn(() => Promise.resolve()),
  unsubscribe: vi.fn(() => Promise.resolve()),
  quit: vi.fn(() => Promise.resolve()),
};

vi.mock('../config/redis.js', () => ({
  connection: { duplicate: () => subscriber, publish: vi.fn(() => Promise.resolve(1)) },
  sanitizeRedisError: (error: unknown) => error,
}));

vi.mock('./pino.js', () => ({
  createDefaultLogger: () => ({ child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) }),
}));

const { createSSEStream, sseEventManager } = await import('./sse.js');

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

interface OpenStreamOptions<T> {
  filter?: (event: T) => boolean;
  userId?: string;
  closeOnUserStatusChange?: boolean;
}

// Opens a real stream on the given event type and returns what got written to it.
const openStream = async <T>(eventType: SSEEventType, options: OpenStreamOptions<T> = {}) => {
  const { filter, userId = 'u1', closeOnUserStatusChange } = options;
  const variables: Record<string, unknown> = { logger, userId };
  const context = {
    get: (key: string) => variables[key],
    header: vi.fn(),
    newResponse: (body: ReadableStream) => new Response(body),
    req: { raw: { signal: new AbortController().signal } },
  } as unknown as Context;
  const response = createSSEStream<T>(context, { eventType, filter, closeOnUserStatusChange });
  const reader = (response as Response).body?.getReader();
  if (!reader) throw new Error('no body');
  await new Promise((resolve) => setTimeout(resolve, 0));
  return reader;
};

const receiveFromRedis = (type: SSEEventType, payload: unknown) =>
  redisHandlers.message?.('sse:events', JSON.stringify({ type, payload }));

describe('SSEEventManager', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sseEventManager.removeAllListeners();
    await sseEventManager.initSubscriber();
  });

  it('re-emits the events of a known type received from Redis', () => {
    const listener = vi.fn();
    sseEventManager.on('requete:updated', listener);

    redisHandlers.message?.('sse:events', JSON.stringify({ type: 'requete:updated', payload: { requeteId: 'R' } }));

    expect(listener).toHaveBeenCalledWith({ requeteId: 'R' });
  });

  it('ignores an event type this build does not know: the bus is shared across versions', () => {
    const listener = vi.fn();
    sseEventManager.on('requete:updated', listener);

    expect(() =>
      redisHandlers.message?.('sse:events', JSON.stringify({ type: 'requete:futureThing', payload: {} })),
    ).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createSSEStream', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sseEventManager.removeAllListeners();
    await sseEventManager.initSubscriber();
  });

  it('drops an event the filter cannot read instead of surfacing an unhandled rejection', async () => {
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);

    const filter = (event: { entiteIds: string[] }) => event.entiteIds.includes('e1');
    await openStream('requete:updated', { filter });

    sseEventManager.emit('requete:updated', { requeteId: 'R' });
    await tick();

    process.off('unhandledRejection', onRejection);
    expect(rejections).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('filter could not read'));
    expect(sseEventManager.listenerCount('requete:updated')).toBe(1);
  });

  describe('closing on user:status', () => {
    const statusEvent = (userId: string) => ({ userId, statutId: 'INACTIF', roleId: 'READER' });

    it('counts one listener per connection: the guard never shows up in the metrics', async () => {
      await openStream('requete:updated');

      expect(sseEventManager.getConnectionCounts()).toMatchObject({ 'requete:updated': 1, 'user:status': 0 });
    });

    it('closes the stream when the subscriber is deactivated or changes role', async () => {
      const reader = await openStream('requete:updated');

      receiveFromRedis('user:status', statusEvent('u1'));
      await tick();

      expect(sseEventManager.listenerCount('requete:updated')).toBe(0);
      expect(sseEventManager.eventNames()).toEqual([]);
      await expect(reader.read()).resolves.toMatchObject({ done: true });
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('status or role changed'));
    });

    it('keeps the stream open on a status change of another user', async () => {
      await openStream('requete:updated');

      receiveFromRedis('user:status', statusEvent('someone-else'));
      await tick();

      expect(sseEventManager.listenerCount('requete:updated')).toBe(1);
    });

    it('keeps the profile stream open so that an inactive account learns about its reactivation', async () => {
      const filter = (event: { userId: string }) => event.userId === 'u1';
      const reader = await openStream('user:status', { filter, closeOnUserStatusChange: false });

      receiveFromRedis('user:status', statusEvent('u1'));
      await tick();

      expect(sseEventManager.listenerCount('user:status')).toBe(1);
      const { value } = await reader.read();
      expect(new TextDecoder().decode(value)).toContain('event: user:status');
    });
  });
});
