import {
  openApi400BadRequest,
  openApi404NotFound,
  openApiProtectedRoute,
  openApiRawResponse,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import {
  CreateChildEntiteAdminResponseSchema,
  CreateDirectionAdminLocalResponseSchema,
  CreateServiceAdminLocalResponseSchema,
  EditEntiteAdminResponseSchema,
  GetDirectionServiceAdminLocalResponseSchema,
  GetDirectionsServicesListResponseSchema,
  GetEntitesByIdAdminResponseSchema,
  GetEntitesListAdminResponseSchema,
  GetEntitiesChainResponseSchema,
  GetEntitiesResponseSchema,
  GetRootEntitesListAdminResponseSchema,
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

export const getRootEntitesListAdminRoute = openApiProtectedRoute({
  description: 'Get root entites list for super admins',
  responses: {
    ...openApiResponses(GetRootEntitesListAdminResponseSchema),
  },
});

export const getDirectionsServicesListRoute = openApiProtectedRoute({
  description: 'Get local directions and services list for entity admins',
  responses: {
    ...openApiRawResponse(GetDirectionsServicesListResponseSchema),
  },
});

export const editDirectionServiceAdminLocalRoute = openApiProtectedRoute({
  description: 'Edit an authorized Direction or Service for a local entity admin',
  responses: {
    ...openApiResponse(GetDirectionServiceAdminLocalResponseSchema),
    ...openApi404NotFound('Entite not found'),
  },
});

export const getDirectionServiceAdminLocalRoute = openApiProtectedRoute({
  description: 'Get an authorized Direction or Service for local entity admin editing',
  responses: {
    ...openApiResponse(GetDirectionServiceAdminLocalResponseSchema),
    ...openApi404NotFound('Entite not found'),
  },
});

export const getEntiteByIdAdminRoute = openApiProtectedRoute({
  description: 'Get entite by id for super admins',
  responses: {
    ...openApiResponse(GetEntitesByIdAdminResponseSchema),
    ...openApi404NotFound('Entite not found'),
  },
});

export const createDirectionAdminLocalRoute = openApiProtectedRoute({
  description: 'Create Direction for entity admins from local directions and services workflow',
  responses: {
    ...openApiResponse(CreateDirectionAdminLocalResponseSchema),
    ...openApi400BadRequest('Child entite creation is not allowed for this parent'),
    ...openApi404NotFound('Entite not found'),
  },
});

export const createServiceAdminLocalRoute = openApiProtectedRoute({
  description: 'Create Service for entity admins from local directions and services workflow',
  responses: {
    ...openApiResponse(CreateServiceAdminLocalResponseSchema),
    ...openApi400BadRequest('Child entite creation is not allowed for this parent'),
    ...openApi404NotFound('Entite not found'),
  },
});

export const createChildEntiteAdminRoute = openApiProtectedRoute({
  description: 'Create child entite for super admins',
  responses: {
    ...openApiResponse(CreateChildEntiteAdminResponseSchema),
    ...openApi400BadRequest('Child entite creation is not allowed for this parent'),
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
