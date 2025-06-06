import { openApiResponses } from '@/helpers/apiResponses';
import { describeRoute } from 'hono-openapi';
import { GetRolesResponseSchema } from './roles.schema';

export const getRolesRoute = describeRoute({
  description: 'Get all users',
  responses: {
    ...openApiResponses(GetRolesResponseSchema),
  },
});
