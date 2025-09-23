import { openApiDeleteResponse, openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { z } from 'zod';
import { RequeteEtapeSchema } from '@/libs/zod';

export const updateRequeteEtapeStatutRoute = openApiProtectedRoute({
  description: 'Update the statut of a RequeteEtape',
  responses: {
    ...openApiResponse(RequeteEtapeSchema),
  },
});

export const updateRequeteEtapeNomRoute = openApiProtectedRoute({
  description: 'Update the "nom" of a RequeteEtape',
  responses: {
    ...openApiResponse(RequeteEtapeSchema),
  },
});

export const deleteRequeteEtapeRoute = openApiProtectedRoute({
  description: 'Delete a RequeteEtape and all its associated notes and files',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'RequeteEtape deleted successfully'),
  },
});
