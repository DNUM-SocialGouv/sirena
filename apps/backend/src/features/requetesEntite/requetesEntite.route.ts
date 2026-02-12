import { openApiProtectedRoute, openApiResponse, openApiResponses } from '@sirena/backend-utils/helpers';
import { RequeteSchema } from '../requetes/requetes.schema.js';
import {
  CloseRequeteResponseSchema,
  GetOtherEntitesAffectedResponseSchema,
  GetRequeteEntiteResponseSchema,
  GetRequetesEntiteResponseSchema,
  UpdateStatutResponseSchema,
} from './requetesEntite.schema.js';

export const getRequetesEntiteRoute = openApiProtectedRoute({
  description: 'Get requetes entites',
  responses: {
    ...openApiResponses(GetRequetesEntiteResponseSchema),
  },
});

export const getOtherEntitesAffectedRoute = openApiProtectedRoute({
  description: 'Get other entites affected by the requete',
  responses: {
    ...openApiResponse(GetOtherEntitesAffectedResponseSchema),
  },
});

export const getRequeteEntiteRoute = openApiProtectedRoute({
  description: 'Get a single requete entite by ID',
  responses: {
    ...openApiResponse(GetRequeteEntiteResponseSchema),
  },
});

export const createRequeteRoute = openApiProtectedRoute({
  description: 'Create a new request with optional declarant information',
  responses: {
    ...openApiResponse(RequeteSchema, 201),
  },
});

export const closeRequeteRoute = openApiProtectedRoute({
  description: 'Close a Requete for a specific entity',
  responses: {
    ...openApiResponse(CloseRequeteResponseSchema),
  },
});

export const updateStatutRoute = openApiProtectedRoute({
  description: 'Update the status of a requete for the current entity',
  responses: {
    ...openApiResponse(UpdateStatutResponseSchema),
  },
});
