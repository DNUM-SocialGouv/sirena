import { openApiProtectedRoute, openApiResponse, openApiResponses } from '@sirena/backend-utils/helpers';
import {
  GetEntitesListAdminResponseSchema,
  GetEntitiesChainResponseSchema,
  GetEntitiesResponseSchema,
} from './entites.schema.js';

export const getEntitesRoute = openApiProtectedRoute({
  description: 'Get entites',
  responses: {
    ...openApiResponses(GetEntitiesResponseSchema),
  },
});

export const getEntitesListAdminRoute = openApiProtectedRoute({
  description: 'Get entites list for super admins',
  responses: {
    ...openApiResponses(GetEntitesListAdminResponseSchema),
  },
});

export const getEntiteChainRoute = openApiProtectedRoute({
  description: 'Get entity chain',
  responses: {
    ...openApiResponse(GetEntitiesChainResponseSchema),
  },
});
