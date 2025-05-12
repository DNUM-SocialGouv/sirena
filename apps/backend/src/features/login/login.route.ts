import { OpenApi404NotFound } from '@/helpers/apiErrors.ts';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { LoginParamsIdSchema } from './login.schema.ts';

export const getLoginRoute = describeRoute({
  description: 'login',
  query: [
    {
      code: {
        description: 'id code',
        required: true,
        schema: resolver(LoginParamsIdSchema),
      },
    },
    {
      state: {
        description: 'state',
        required: true,
        schema: resolver(LoginParamsIdSchema),
      },
    },
    {
      iss: {
        description: 'iss',
        required: true,
        schema: resolver(LoginParamsIdSchema),
      },
    },
  ],
});
