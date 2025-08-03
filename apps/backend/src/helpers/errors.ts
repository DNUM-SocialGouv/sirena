import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { enrichUserContext, extractRequestContext } from '@/helpers/middleware';
import type { AppBindings } from './factories/appWithLogs';

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  const logger = c.get('logger');
  logger.error({ err }, 'Internal server error');

  const sentry = c.get('sentry');
  if (sentry) {
    try {
      const requestContext = extractRequestContext(c);
      const userContext = enrichUserContext(requestContext);

      sentry.setContext('error_handler', {
        method: c.req.method,
        path: c.req.path,
        url: c.req.url,
      });

      if (userContext) {
        sentry.setUser({
          id: userContext.userId,
          ...(userContext.roleId && { role: userContext.roleId }),
          ...(userContext.entiteIds &&
            userContext.entiteIds.length > 0 && {
              entiteIds: userContext.entiteIds.join(','),
            }),
        });
      }

      sentry.setTag('error_source', 'global_handler');

      sentry.captureException(err);
    } catch (sentryError) {
      logger.error({ err: sentryError }, 'Failed to set Sentry context in error handler');
    }
  }

  return c.json({ message: 'Internal server error' }, 500);
};

type SerializedError = {
  message: string;
  stack?: string;
};

export const serializeError = (error: unknown): SerializedError => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  return { message: JSON.stringify(error), stack: undefined };
};
