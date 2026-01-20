import { openApiResponses } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { GetRolesResponseSchema } from './roles.schema.js';

export const getRolesRoute = describeRoute({
  description: 'Get all roles',
  responses: {
    ...openApiResponses(GetRolesResponseSchema),
  },
});
