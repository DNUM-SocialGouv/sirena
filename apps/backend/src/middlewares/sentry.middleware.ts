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

export const sentryMiddleware = () => {
  const baseSentryMiddleware = sentry({
    dsn: envVars.SENTRY_DSN_BACKEND,
    environment: envVars.SENTRY_ENVIRONMENT,
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

const setUserContext = (c: Context, user: User, context: ReturnType<typeof extractRequestContext>) => {
  const rawIp = extractClientIp(c);

  Sentry.getCurrentScope().setUser(createSentryUserContext(user, rawIp));

  const businessContext = createSentryBusinessContext(context);
  if (businessContext) {
    Sentry.getCurrentScope().setContext('business', {
      ...businessContext,
      userEmail: user.email,
    });
  }

  Sentry.getCurrentScope().setFingerprint(['user', user.id]);
};
