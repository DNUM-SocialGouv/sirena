import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from '@/libs/zod';
import type { AppBindings } from './factories/appWithLogs';

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  const logger = c.get('logger');
  logger.error({ err }, 'Internal server error');
  return c.json({ message: 'Internal server error' }, 500);
};

export const HTTPExceptionSchema = z.object({
  message: z.string(),
  error: z.string().optional(),
});
