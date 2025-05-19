import { OpenApi302Redirect, OpenApi400ZodError, OpenApi503Error } from '@/helpers/apiErrors.ts';
import { describeRoute } from 'hono-openapi';

export const getLoginRoute = describeRoute({
  description: 'login',
  responses: {
    ...OpenApi302Redirect(),
    ...OpenApi400ZodError('Invalid payload'),
  },
});
