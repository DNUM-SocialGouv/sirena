import { HTTPException503ServiceUnavailable, OpenApi400ZodError, OpenApi404NotFound } from '@/helpers/apiErrors.ts';
import { describeRoute } from 'hono-openapi';

export const getLoginRoute = describeRoute({
  description: 'login',
  query: [
    {
      code: {
        description: 'id code',
        required: true,
      },
    },
    {
      state: {
        description: 'state',
        required: true,
      },
    },
    {
      iss: {
        description: 'iss',
        required: true,
      },
    },
  ],
  responses: {
    ...OpenApi400ZodError('Invalid payload'),
    ...HTTPException503ServiceUnavailable('Service Unavailable'),
  },
});
