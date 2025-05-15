import { OpenApi400ZodError, OpenApi503ZodError } from '@/helpers/apiErrors.ts';
import { describeRoute } from 'hono-openapi';

export const getLoginRoute = describeRoute({
  description: 'login',
  responses: {
    ...OpenApi400ZodError('Invalid payload'),
    ...OpenApi503ZodError('Service Unavailable'),
  },
});
