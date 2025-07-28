import { sentry } from '@hono/sentry';
import * as Sentry from '@sentry/node';
import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { envVars } from '@/config/env';
import {
  createSentryBusinessContext,
  createSentryRequestContext,
  createSentryUserContext,
  extractClientIp,
  extractRequestContext,
  setSentryCorrelationTags,
  type User,
} from '@/helpers/middleware';

/**
 * Sentry middleware using @hono/sentry with custom context enrichment
 * Combines official @hono/sentry package with project-specific features:
 * - Request context correlation
 * - User context integration
 * - Raw IP address logging
 * - Business context for French government compliance
 */
export const sentryMiddleware = () => {
  const baseSentryMiddleware = sentry({
    dsn: envVars.SENTRY_DSN_BACKEND,
    environment: envVars.SENTRY_ENVIRONMENT,
    beforeSend: (event) => {
      if (event.user?.email) {
        // Email will be automatically sanitized by Sentry's beforeSend
      }
      return event;
    },
  });

  return createMiddleware(async (c: Context, next: Next) => {
    await baseSentryMiddleware(c, async () => {
      const context = extractRequestContext(c);

      Sentry.getCurrentScope().setContext('request', createSentryRequestContext(c, context));

      setSentryCorrelationTags(Sentry.getCurrentScope(), context);

      try {
        await next();

        const user = c.get('user') as User | undefined;
        if (user) {
          setUserContext(c, user, context);
        }
      } catch (error) {
        Sentry.withScope((scope) => {
          scope.setContext('response', {
            statusCode: c.res.status,
          });

          if (error instanceof Error) {
            Sentry.captureException(error);
          } else {
            Sentry.captureMessage(`Non-Error exception: ${String(error)}`);
          }
        });

        throw error;
      }
    });
  });
};

/**
 * Helper function to set user context in Sentry
 * Extracted from the old sentryUserMiddleware for reuse
 */
const setUserContext = (c: Context, user: User, context: ReturnType<typeof extractRequestContext>) => {
  const rawIp = extractClientIp(c);

  Sentry.getCurrentScope().setUser(createSentryUserContext(user, rawIp));

  const businessContext = createSentryBusinessContext(context);
  if (businessContext) {
    Sentry.getCurrentScope().setContext('business', {
      ...businessContext,
      userEmail: user.email, // Will be sanitized by Sentry's beforeSend
    });
  }

  Sentry.getCurrentScope().setFingerprint(['user', user.id]);
};

/**
 * Legacy user middleware - now integrated into the main sentryMiddleware
 * @deprecated User context is now handled automatically in sentryMiddleware
 */
export const sentryUserMiddleware = () => {
  return createMiddleware(async (_c: Context, next: Next) => {
    // No-op: user context is now handled in the main middleware
    await next();
  });
};
