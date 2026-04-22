import {
  openApi404NotFound,
  openApiProtectedRoute,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import {
  CreateChildEntiteAdminResponseSchema,
  EditEntiteAdminResponseSchema,
  GetEntitesByIdAdminResponseSchema,
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

export const getEntiteByIdAdminRoute = openApiProtectedRoute({
  description: 'Get entite by id for super admins',
  responses: {
    ...openApiResponse(GetEntitesByIdAdminResponseSchema),
    ...openApi404NotFound('Entite not found'),
  },
});

export const createChildEntiteAdminRoute = openApiProtectedRoute({
  description: 'Create child entite for super admins',
  responses: {
    ...openApiResponse(CreateChildEntiteAdminResponseSchema),
    ...openApi404NotFound('Entite not found'),
  },
});

export const editEntiteAdminRoute = openApiProtectedRoute({
  description: 'Edit entite',
  responses: {
    ...openApiResponse(EditEntiteAdminResponseSchema),
    ...openApi404NotFound('Entite not found'),
  },
});

export const getEntiteChainRoute = openApiProtectedRoute({
  description: 'Get entity chain',
  responses: {
    ...openApiResponse(GetEntitiesChainResponseSchema),
  },
});
