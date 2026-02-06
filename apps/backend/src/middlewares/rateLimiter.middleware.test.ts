import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rateLimiter } from './rateLimiter.middleware.js';

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
  let redis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    setex: ReturnType<typeof vi.fn>;
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let extractClientIp: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const { connection } = await import('../config/redis.js');
    const middlewareHelper = await import('../helpers/middleware.js');
    redis = connection;
    extractClientIp = middlewareHelper.extractClientIp as ReturnType<typeof vi.fn>;

    vi.clearAllMocks();

    app = new Hono();
    app.use('*', (c, next) => {
      c.set('logger', {
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        bindings: () => ({ traceId: 'test-trace-id' }),
      });
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
  });

  it('should allow request when IP is not banned', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(null);

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(redis.get).toHaveBeenCalledWith('ban:192.168.1.1');
  });

  it('should block request when IP is banned', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    const bannedUntil = Date.now() + 60000;
    redis.get.mockResolvedValue(JSON.stringify({ bannedUntil, banCount: 1 }));

    const res = await app.request('/test');

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(json.error.retryAfter).toBeGreaterThan(0);
  });

  it('should increment attempts on failed authentication', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(null);
    redis.incr.mockResolvedValue(1);

    const res = await app.request('/test?fail=true');

    expect(res.status).toBe(401);
    expect(redis.incr).toHaveBeenCalledWith('attempts:192.168.1.1');
    expect(redis.expire).toHaveBeenCalledWith('attempts:192.168.1.1', 900);
  });

  it('should ban IP after max attempts exceeded', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(null);
    redis.incr.mockResolvedValue(3);

    const res = await app.request('/test?fail=true');

    expect(res.status).toBe(401);
    expect(redis.setex).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith('attempts:192.168.1.1');
  });

  it('should use exponential backoff for repeated bans', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockImplementation((key) => {
      if (key === 'bancount:192.168.1.1') {
        return Promise.resolve('2');
      }
      return Promise.resolve(null);
    });
    redis.incr.mockResolvedValue(3);

    await app.request('/test?fail=true');

    const setexCalls = redis.setex.mock.calls;
    const banCall = setexCalls.find((call: unknown[]) => call[0] === 'ban:192.168.1.1');

    expect(banCall).toBeDefined();
    const banData = JSON.parse(banCall[2]);
    expect(banData.banCount).toBe(3);
  });

  it('should clear attempts on successful authentication', async () => {
    extractClientIp.mockReturnValue('192.168.1.1');
    redis.get.mockResolvedValue(null);

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(redis.del).toHaveBeenCalledWith('attempts:192.168.1.1');
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
});
