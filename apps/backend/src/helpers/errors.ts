import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import zod from 'zod';
import type { AppBindingsLogs } from './factories/appWithLogs.ts';
import 'zod-openapi/extend';

export const errorHandler: ErrorHandler<AppBindingsLogs> = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  const logger = c.get('logger');
  logger.error(err);
  return c.json({ message: 'Internal server error' }, 500);
};

export const HTTPExceptionSchema = zod.object({
  message: zod.string(),
  error: zod.string().optional(),
});

export const HTTPException404NotFound = () => new HTTPException(404, { message: 'Not Found' });
