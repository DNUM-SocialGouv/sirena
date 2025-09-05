import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppBindings } from './factories/appWithLogs';

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  const logger = c.get('logger');
  logger.error({ err }, 'Internal server error');

  const sentry = c.get('sentry');
  if (sentry) {
    sentry.setTag('error_source', 'global_handler');
    sentry.captureException(err);
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
