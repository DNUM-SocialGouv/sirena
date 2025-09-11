import * as Sentry from '@sentry/node';
import type { Context, MiddlewareHandler } from 'hono';
import { createFactory } from 'hono/factory';
import { envVars } from '@/config/env';
import type { AppBindings as AuthAppBindings } from '@/helpers/factories/appWithAuth';
import type { AppBindings as LogsAppBindings } from '@/helpers/factories/appWithLogs';
import { extractRequestContext, type RequestContext, SOURCE_BACKEND } from '@/helpers/middleware';
import { sentryStorage } from '@/libs/asyncLocalStorage';

export const createSentryRequestContext = (c: Context, context: RequestContext) => {
  return {
    id: context.requestId,
    traceId: context.traceId,
    sessionId: context.sessionId,
    method: c.req.method,
    url: c.req.url,
    path: c.req.path,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    ip: context.ip,
    userAgent: context.userAgent,
    source: SOURCE_BACKEND,
  };
};

// Combine types: Sentry middleware needs logs + optional auth data
type SentryAppBindings = {
  Variables: LogsAppBindings['Variables'] & Partial<AuthAppBindings['Variables']>;
};

const factory = createFactory<SentryAppBindings>();

export const sentryContextMiddleware = (): MiddlewareHandler<SentryAppBindings> =>
  factory.createMiddleware(async (c, next) => {
    if (!envVars.SENTRY_ENABLED) {
      await next();
      return;
    }
    await Sentry.withScope(async (scope) => {
      await sentryStorage.run(scope, async () => {
        try {
          const context = extractRequestContext(c);
          const sentryRequestContext = createSentryRequestContext(c, context);
          scope.setContext('request', sentryRequestContext);
        } catch (error) {
          const logger = c.get('logger');
          if (logger) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.warn({ error: errorMsg }, 'Failed to set Sentry context');
          }
        }
        await next();
      });
    });
  });
