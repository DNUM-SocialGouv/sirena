import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attemptsKey, banCountKey, banKey } from '../config/redis.constant.js';

vi.mock('../config/redis.js', () => ({
  connection: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../helpers/middleware.js', () => ({
  UNKNOWN_VALUE: 'unknown',
  extractClientIp: vi.fn(),
}));

describe('rateLimiter middleware', () => {
  let app: Hono;
  let rateLimiter: typeof import('./rateLimiter.middleware.js').rateLimiter;
  let redis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    setex: ReturnType<typeof vi.fn>;
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let extractClientIp: ReturnType<typeof vi.fn>;
  let logger: {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    bindings: () => { traceId: string };
  };

  beforeEach(async () => {
    const { connection } = await import('../config/redis.js');
    const middlewareHelper = await import('../helpers/middleware.js');
    const rateLimiterModule = await import('./rateLimiter.middleware.js');
    redis = connection as unknown as typeof redis;
    extractClientIp = middlewareHelper.extractClientIp as ReturnType<typeof vi.fn>;
    rateLimiter = rateLimiterModule.rateLimiter;

    vi.clearAllMocks();

    logger = {
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      bindings: () => ({ traceId: 'test-trace-id' }),
    };

    app = new Hono();
    app.use('*', (c, next) => {
      (c as unknown as { set: (key: string, value: unknown) => void }).set('logger', logger);
      return next();
    });
    app.use('*', rateLimiter({ maxAttempts: 3, baseBanTimeMinutes: 1 }));
    app.get('/test', (c) => {
      const fail = c.req.query('fail');
      if (fail === 'true') {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      return c.json({ success: true }, 200);
    });
    app.onError((err) => {
      const e = err as unknown as Record<string, unknown>;
      if (typeof e.getResponse === 'function' && typeof e.status === 'number') {
        return (err as { getResponse: () => Response }).getResponse();
      }
      return new Response('Internal Server Error', { status: 500 });
    });
  });

  it('should allow request when IP is not banned', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(null);

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(redis.get).toHaveBeenCalledWith(banKey('192.168.1.1'));
  });

  it('should block request when IP is banned', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    const bannedUntil = Date.now() + 60000;
    redis.get.mockResolvedValue(JSON.stringify({ bannedUntil, banCount: 1 }));

    const res = await app.request('/test');

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
    const json = await res.json();
    expect(json.message).toContain('Too many failed attempts');
  });

  it('should increment attempts on failed authentication', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(null);
    redis.incr.mockResolvedValue(1);

    const res = await app.request('/test?fail=true');

    expect(res.status).toBe(401);
    expect(redis.incr).toHaveBeenCalledWith(attemptsKey('192.168.1.1'));
    expect(redis.expire).toHaveBeenCalledWith(attemptsKey('192.168.1.1'), 900);
  });

  it('should ban IP after max attempts exceeded', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(null);
    redis.incr.mockResolvedValue(3);

    const res = await app.request('/test?fail=true');

    expect(res.status).toBe(401);
    expect(redis.setex).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(attemptsKey('192.168.1.1'));
  });

  it('should use exponential backoff for repeated bans', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockImplementation((key) => {
      if (key === banCountKey('192.168.1.1')) {
        return Promise.resolve('2');
      }
      return Promise.resolve(null);
    });
    redis.incr.mockResolvedValue(3);

    await app.request('/test?fail=true');

    const setexCalls = redis.setex.mock.calls;
    const banCall = setexCalls.find((call: unknown[]) => call[0] === banKey('192.168.1.1'));

    expect(banCall).toBeDefined();
    const banData = JSON.parse(banCall?.[2]);
    expect(banData.banCount).toBe(3);
  });

  it('should clear attempts on successful authentication', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(null);

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(redis.del).toHaveBeenCalledWith(attemptsKey('192.168.1.1'));
  });

  it('should handle missing IP gracefully', async () => {
    extractClientIp.mockReturnValue('unknown');

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('should continue on Redis errors', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockRejectedValue(new Error('Redis connection failed'));

    const res = await app.request('/test');

    expect(res.status).toBe(200);
  });

  it('should log the fail-open once, with the cause, when the ban status cannot be read', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    const cause = new Error('Redis connection failed');
    redis.get.mockRejectedValue(cause);

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: cause, clientIP: '192.168.1.1', traceId: 'test-trace-id' }),
      expect.stringContaining('fail-open'),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should drop a corrupted ban entry and let the request through', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue('not-json-at-all');

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(redis.del).toHaveBeenCalledWith(banKey('192.168.1.1'));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ clientIP: '192.168.1.1', traceId: 'test-trace-id' }),
      expect.stringContaining('Corrupted ban data'),
    );
  });

  it('should drop a ban entry whose shape is unexpected', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue('null');

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(redis.del).toHaveBeenCalledWith(banKey('192.168.1.1'));
  });

  it.each([
    ['a ban lasting forever', JSON.stringify({ bannedUntil: Number.POSITIVE_INFINITY, banCount: 1 })],
    ['a ban already in the past', JSON.stringify({ bannedUntil: -1, banCount: 1 })],
    ['a ban count below one', JSON.stringify({ bannedUntil: Date.now() + 60_000, banCount: 0 })],
    ['an empty entry', ''],
  ])('should drop a ban entry describing %s', async (_label, cached) => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(cached);

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(redis.del).toHaveBeenCalledWith(banKey('192.168.1.1'));
  });

  it('should let the request through when dropping the corrupted entry fails', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue('not-json-at-all');
    const cause = new Error('Redis connection failed');
    redis.del.mockRejectedValue(cause);

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: cause, clientIP: '192.168.1.1', traceId: 'test-trace-id' }),
      expect.stringContaining('Error deleting corrupted ban key'),
    );
  });
});
