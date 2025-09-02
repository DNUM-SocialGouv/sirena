import type { MiddlewareHandler } from 'hono';
import { createFactory } from 'hono/factory';
import type { PinoLogger } from 'hono-pino';
import type { AppBindings as AuthAppBindings } from '@/helpers/factories/appWithAuth';
import type { AppBindings as LogsAppBindings } from '@/helpers/factories/appWithLogs';
import { createSentryRequestContext, createSentryUserContext, extractRequestContext } from '@/helpers/middleware';
import type { User } from '@/libs/prisma';

export interface SentryHub {
  setContext: (key: string, context: Record<string, unknown>) => void;
  setUser: (user: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  captureException: (error: Error) => void;
}

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

      // Get auth data directly from context (available after auth middleware)
      const userId: string | undefined = c.get('userId');
      const roleId: string | undefined = c.get('roleId');
      const entiteIds: string[] | null | undefined = c.get('entiteIds');

      if (userId) {
        const user: Pick<User, 'id' | 'email'> = {
          id: userId,
          email: userId,
        };
        const sentryUserContext = createSentryUserContext(user as User, context.ip);
        sentry.setUser(sentryUserContext);
      }

      if (roleId) {
        sentry.setTag('roleId', roleId);
      }

      if (entiteIds && entiteIds.length > 0) {
        sentry.setTag('entiteIds', entiteIds.join(','));
      }
    } catch (error) {
      const logger: PinoLogger = c.get('logger');
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn({ error: errorMessage }, 'Failed to set Sentry context');
    }

    await next();
  });
