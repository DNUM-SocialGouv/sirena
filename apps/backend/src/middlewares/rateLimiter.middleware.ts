import type { MiddlewareHandler } from 'hono';
import { connection as redis } from '../config/redis.js';
import type { AppBindings } from '../helpers/factories/appWithLogs.js';
import factoryWithLogs from '../helpers/factories/appWithLogs.js';
import { extractClientIp, UNKNOWN_VALUE } from '../helpers/middleware.js';

interface RateLimiterOptions {
  maxAttempts?: number;
  baseBanTimeMinutes?: number;
}

interface BanData {
  bannedUntil: number;
  banCount: number;
}

export function rateLimiter(options: RateLimiterOptions = {}): MiddlewareHandler<AppBindings> {
  const maxAttempts = options.maxAttempts ?? 5;
  const baseBanTimeMinutes = options.baseBanTimeMinutes ?? 1;

  return factoryWithLogs.createMiddleware(async (c, next) => {
    const logger = c.get('logger');
    const loggerBindings = logger.bindings() as { traceId?: string };
    const traceId = loggerBindings.traceId ?? 'unknown';

    const clientIP = extractClientIp(c);

    if (clientIP === UNKNOWN_VALUE) {
      logger.warn({ traceId }, 'Unable to determine client IP for rate limiting');
      await next();
      return;
    }

    const banKey = `ban:${clientIP}`;
    const attemptsKey = `attempts:${clientIP}`;

    try {
      const banData = await redis.get(banKey);
      if (banData) {
        const { bannedUntil, banCount } = JSON.parse(banData) as BanData;
        const now = Date.now();

        if (now < bannedUntil) {
          const remainingSeconds = Math.ceil((bannedUntil - now) / 1000);
          logger.warn(
            {
              clientIP,
              traceId,
              remainingSeconds,
              banCount,
            },
            'IP is currently banned',
          );

          return c.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many failed attempts. Please try again in ${remainingSeconds} seconds.`,
                traceId,
                retryAfter: remainingSeconds,
              },
            },
            429,
          );
        }

        await redis.del(banKey);
      }
    } catch (error) {
      logger.error({ err: error, clientIP, traceId }, 'Error checking ban status');
    }

    await next();

    try {
      const responseStatus = c.res.status;

      logger.debug(
        {
          clientIP,
          traceId,
          responseStatus,
        },
        'Rate limiter checking response status',
      );

      if (responseStatus === 401) {
        const attempts = await redis.incr(attemptsKey);

        if (attempts === 1) {
          await redis.expire(attemptsKey, 900);
        }

        logger.warn(
          {
            clientIP,
            traceId,
            attempts,
            maxAttempts,
          },
          'Failed authentication attempt',
        );

        if (attempts >= maxAttempts) {
          const previousBanData = await redis.get(`bancount:${clientIP}`);
          const banCount = previousBanData ? Number.parseInt(previousBanData, 10) + 1 : 1;

          const banTimeMinutes = 2 ** (banCount - 1) * baseBanTimeMinutes;
          const banTimeMs = banTimeMinutes * 60 * 1000;
          const bannedUntil = Date.now() + banTimeMs;

          await redis.setex(banKey, Math.ceil(banTimeMs / 1000), JSON.stringify({ bannedUntil, banCount }));
          await redis.setex(`bancount:${clientIP}`, 86400, banCount.toString());
          await redis.del(attemptsKey);

          logger.warn(
            {
              clientIP,
              traceId,
              banCount,
              banTimeMinutes,
            },
            'IP banned due to excessive failed attempts',
          );
        }
      } else if (responseStatus === 200) {
        await redis.del(attemptsKey);
      }
    } catch (error) {
      logger.error({ err: error, clientIP, traceId }, 'Error tracking authentication attempts');
    }
  });
}
