import { OpenApi302Redirect } from '@/helpers/apiErrors.ts';
import { describeRoute } from 'hono-openapi';

export const getLogoutRoute = describeRoute({
  description: 'logout',
  responses: {
    ...OpenApi302Redirect(),
  },
});
