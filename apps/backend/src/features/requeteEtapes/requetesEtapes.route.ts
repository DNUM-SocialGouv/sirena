import { openApiDeleteResponse, openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { z } from 'zod';
import { RequeteEtapeNoteSchema, RequeteEtapeSchema } from '@/libs/zod';

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

export const addRequeteEtapesNoteRoute = openApiProtectedRoute({
  description: 'Add a processing note to a step of a request',
  responses: {
    ...openApiResponse(RequeteEtapeNoteSchema),
  },
});

export const updateRequeteEtapesNoteRoute = openApiProtectedRoute({
  description: 'Update the content of a processing note and optionally add new files',
  responses: {
    ...openApiResponse(RequeteEtapeNoteSchema),
  },
});

export const deleteRequeteEtapesNoteRoute = openApiProtectedRoute({
  description: 'Delete a processing note from a step of a request (and all its associated files)',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'Note deleted successfully'),
  },
});

export const deleteRequeteEtapeRoute = openApiProtectedRoute({
  description: 'Delete a RequeteEtape and all its associated notes and files',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'RequeteEtape deleted successfully'),
  },
});
