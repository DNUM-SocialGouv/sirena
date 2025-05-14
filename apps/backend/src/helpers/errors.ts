import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import 'zod-openapi/extend';
import type { AppBindingsLogs } from './factories/appWithLogs.ts';

export const errorHandler: ErrorHandler<AppBindingsLogs> = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  const logger = c.get('logger');
  logger.error(err);
  return c.json({ message: 'Internal server error' }, 500);
};

export const HTTPExceptionSchema = z.object({
  message: z.string(),
  error: z.string().optional(),
});

export const HTTPException404NotFound = () => new HTTPException(404, { message: 'Not Found' });

export const HTTPException503NotAvailable = () => new HTTPException(503, { message: 'Service not available' });
