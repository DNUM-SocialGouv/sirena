import { openApiProtectedRoute, openApiResponse, openApiResponses } from '@sirena/backend-utils/helpers';
import {
  GetAdminEntitesResponseSchema,
  GetEntitiesChainResponseSchema,
  GetEntitiesResponseSchema,
} from './entites.schema.js';

export const getEntitesRoute = openApiProtectedRoute({
  description: 'Get entites',
  responses: {
    ...openApiResponses(GetEntitiesResponseSchema),
  },
});

export const getEntitesAdminRoute = openApiProtectedRoute({
  description: 'Get admin entites',
  responses: {
    ...openApiResponses(GetAdminEntitesResponseSchema),
  },
});

export const getEntiteChainRoute = openApiProtectedRoute({
  description: 'Get entity chain',
  responses: {
    ...openApiResponse(GetEntitiesChainResponseSchema),
  },
});
