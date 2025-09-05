import type { Context, MiddlewareHandler } from 'hono';
import { createFactory } from 'hono/factory';
import type { AppBindings as AuthAppBindings } from '@/helpers/factories/appWithAuth';
import type { AppBindings as LogsAppBindings } from '@/helpers/factories/appWithLogs';
import {
  type EnrichedUserContext,
  enrichUserContext,
  extractRequestContext,
  type RequestContext,
  SOURCE_BACKEND,
  UNKNOWN_VALUE,
} from '@/helpers/middleware';

export interface SentryHub {
  setContext: (key: string, context: Record<string, unknown>) => void;
  setUser: (user: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  captureException: (error: Error) => void;
}

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

export const createSentryUserFromContext = (userContext: EnrichedUserContext, rawIp: string) => {
  return {
    id: userContext.userId,
    email: userContext.email,
    ...(rawIp && rawIp !== UNKNOWN_VALUE && { ip_address: rawIp }),
    ...(userContext.roleId && { roleId: userContext.roleId }),
    ...(userContext.entiteIds && userContext.entiteIds.length > 0 && { entiteIds: userContext.entiteIds }),
  };
};

// Define Sentry-specific variables
type SentryVariables = {
  sentry?: SentryHub;
};

// Combine types: Sentry middleware needs logs + optional auth data + sentry instance
type SentryAppBindings = {
  Variables: LogsAppBindings['Variables'] & Partial<AuthAppBindings['Variables']> & SentryVariables;
};

const factory = createFactory<SentryAppBindings>();

export const sentryContextMiddleware = (): MiddlewareHandler<SentryAppBindings> =>
  factory.createMiddleware(async (c, next) => {
    const sentry: SentryHub | undefined = c.get('sentry');
    if (!sentry) {
      await next();
      return;
    }

    try {
      const context = extractRequestContext(c);
      const sentryRequestContext = createSentryRequestContext(c, context);
      sentry.setContext('request', sentryRequestContext);

      const userContext = enrichUserContext(context);
      if (userContext) {
        const sentryUser = createSentryUserFromContext(userContext, context.ip);
        sentry.setUser(sentryUser);

        if (userContext.roleId) {
          sentry.setTag('roleId', userContext.roleId);
        }

        if (userContext.entiteIds && userContext.entiteIds.length > 0) {
          sentry.setTag('entiteIds', userContext.entiteIds.join(','));
        }
      }
    } catch (error) {
      const logger = c.get('logger');
      if (logger) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn({ error: errorMsg }, 'Failed to set Sentry context');
      }
    }

    await next();
  });
