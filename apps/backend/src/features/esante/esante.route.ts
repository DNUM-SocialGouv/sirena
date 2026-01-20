import { openApiProtectedRoute, openApiResponses } from '@sirena/backend-utils/helpers';
import { GetOrganizationsResponseSchema, GetPractionnersResponseSchema } from './esante.schema.js';

export const getPractionnersRoute = openApiProtectedRoute({
  description: 'Get all practionners with esante',
  responses: {
    ...openApiResponses(GetPractionnersResponseSchema),
  },
});

export const getOrganizationsRoute = openApiProtectedRoute({
  description: 'Get all organizations with esante',
  responses: {
    ...openApiResponses(GetOrganizationsResponseSchema),
  },
});
