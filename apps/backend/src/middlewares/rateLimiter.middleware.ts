import { throwHTTPException429TooManyRequests } from '@sirena/backend-utils/helpers';
import type { MiddlewareHandler } from 'hono';
import { attemptsKey, banCountKey, banKey } from '../config/redis.constant.js';
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

    const clientBanKey = banKey(clientIP);
    const clientAttemptsKey = attemptsKey(clientIP);

    let banDataStr: string | null = null;
    try {
      banDataStr = await redis.get(clientBanKey);
    } catch (error) {
      logger.error({ err: error, clientIP, traceId }, 'Error checking ban status');
    }

    if (banDataStr) {
      const { bannedUntil, banCount } = JSON.parse(banDataStr) as BanData;
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

        throwHTTPException429TooManyRequests(
          `Too many failed attempts. Please try again in ${remainingSeconds} seconds.`,
          { res: c.res, headers: { 'Retry-After': String(remainingSeconds) } },
        );
      }

      try {
        await redis.del(clientBanKey);
      } catch (error) {
        logger.error({ err: error, clientIP, traceId }, 'Error deleting expired ban key');
      }
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
        const attempts = await redis.incr(clientAttemptsKey);

        if (attempts === 1) {
          await redis.expire(clientAttemptsKey, 900);
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
          const clientBanCountKey = banCountKey(clientIP);
          const previousBanData = await redis.get(clientBanCountKey);
          const banCount = previousBanData ? Number.parseInt(previousBanData, 10) + 1 : 1;

          const banTimeMinutes = 2 ** (banCount - 1) * baseBanTimeMinutes;
          const banTimeMs = banTimeMinutes * 60 * 1000;
          const bannedUntil = Date.now() + banTimeMs;

          await redis.setex(clientBanKey, Math.ceil(banTimeMs / 1000), JSON.stringify({ bannedUntil, banCount }));
          await redis.setex(clientBanCountKey, 86400, banCount.toString());
          await redis.del(clientAttemptsKey);

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
      } else if (responseStatus >= 200 && responseStatus < 300) {
        await redis.del(clientAttemptsKey);
      }
    } catch (error) {
      logger.error({ err: error, clientIP, traceId }, 'Error tracking authentication attempts');
    }
  });
}
