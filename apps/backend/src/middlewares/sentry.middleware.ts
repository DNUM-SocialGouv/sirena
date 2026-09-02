import * as Sentry from '@sentry/node';
import type { Context, MiddlewareHandler } from 'hono';
import { createFactory } from 'hono/factory';
import { envVars } from '../config/env.js';
import type { AppBindings as AuthAppBindings } from '../helpers/factories/appWithAuth.js';
import type { AppBindings as LogsAppBindings } from '../helpers/factories/appWithLogs.js';
import { extractRequestContext, type RequestContext, SOURCE_BACKEND } from '../helpers/middleware.js';
import { sentryStorage } from '../libs/asyncLocalStorage.js';

export const createSentryRequestContext = (c: Context, context: RequestContext) => {
  return {
    id: context.requestId,
    traceId: context.traceId,
    sessionId: context.sessionId,
    method: c.req.method,
    url: c.req.url,
    path: c.req.path,
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
    // Set request context on the isolation scope, which @sentry/node already
    // forks per request. Do NOT wrap the request in Sentry.withScope: in
    // @sentry/node v10 each withScope() call retains ~1.2 KB that is never
    // reclaimed, so one fork per request leaks the heap until the pod is
    // OOMKilled (~110 MB / 50k requests, measured).
    //
    // Per-request isolation here relies on httpIntegration() (bundled in
    // Sentry.defaultIntegrations) forking the isolation scope for each incoming
    // request via diagnostics_channel. If instrument.ts ever disables the
    // default integrations, httpIntegration() must be kept explicitly — without
    // it getIsolationScope() is a global singleton and the request context /
    // user set below would leak across concurrent requests.
    const scope = Sentry.getIsolationScope();
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
