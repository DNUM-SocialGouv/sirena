import * as Sentry from '@sentry/node';
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { envVars } from '@/config/env';
import { sentryStorage } from '@/libs/asyncLocalStorage';
import type { AppBindings } from './factories/appWithLogs';

export const isHTTPException = (err: unknown): err is HTTPException => {
  const errObj = err as unknown as Record<string, unknown>;
  return (
    err instanceof HTTPException ||
    (err !== null && typeof errObj.getResponse === 'function' && typeof errObj.status === 'number')
  );
};

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  if (isHTTPException(err)) {
    return err.getResponse();
  }

  const logger = c.get('logger');
  if (logger) {
    logger.error({ err }, 'Internal server error');
  }

  if (envVars.SENTRY_ENABLED) {
    const sentryScope = sentryStorage.getStore();
    if (sentryScope) {
      // Use the isolated scope from asyncLocalStorage
      sentryScope.setTag('error_source', 'global_handler');
      Sentry.captureException(err, sentryScope);
    } else {
      // If not in scope context, create a new isolated scope
      Sentry.withScope((scope) => {
        scope.setTag('error_source', 'global_handler');
        Sentry.captureException(err, scope);
      });
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
