import { OpenApi400ZodError, OpenApi503Error } from '@/helpers/apiErrors.ts';
import { describeRoute } from 'hono-openapi';

export const getLoginRoute = describeRoute({
  description: 'login',
  responses: {
    ...OpenApi400ZodError('Invalid payload'),
    ...OpenApi503Error('Service Unavailable'),
  },
});
