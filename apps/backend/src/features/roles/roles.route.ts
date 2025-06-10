import { openApiResponses } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { GetRolesResponseSchema } from './roles.schema';

export const getRolesRoute = describeRoute({
  description: 'Get all users',
  responses: {
    ...openApiResponses(GetRolesResponseSchema),
  },
});
