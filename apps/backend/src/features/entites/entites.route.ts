import { openApiProtectedRoute, openApiResponse, openApiResponses } from '@sirena/backend-utils/helpers';
import { GetEntitiesChainResponseSchema, GetEntitiesResponseSchema } from './entites.schema';

export const getEntitesRoute = openApiProtectedRoute({
  description: 'Get entites',
  responses: {
    ...openApiResponses(GetEntitiesResponseSchema),
  },
});

export const getEntiteChainRoute = openApiProtectedRoute({
  description: 'Get entity chain',
  responses: {
    ...openApiResponse(GetEntitiesChainResponseSchema),
  },
});
