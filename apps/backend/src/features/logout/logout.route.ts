import { OpenApi503Error } from '@/helpers/apiErrors.ts';
import { describeRoute } from 'hono-openapi';

export const getLogoutRoute = describeRoute({
  description: 'logout',
  responses: {
    ...OpenApi503Error('Service Unavailable'),
  },
});
