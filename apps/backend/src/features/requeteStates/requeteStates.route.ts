import { openApiDeleteResponse, openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { z } from 'zod';
import { RequeteStateNoteSchema, RequeteStateSchema } from '@/libs/zod';

export const updateRequeteStateStatutRoute = openApiProtectedRoute({
  description: 'Update the statut of a RequeteState',
  responses: {
    ...openApiResponse(RequeteStateSchema),
  },
});

export const updateRequeteStateStepNameRoute = openApiProtectedRoute({
  description: 'Update the stepName of a RequeteState',
  responses: {
    ...openApiResponse(RequeteStateSchema),
  },
});

export const addRequeteStatesNoteRoute = openApiProtectedRoute({
  description: 'Add a processing note to a step of a request',
  responses: {
    ...openApiResponse(RequeteStateNoteSchema),
  },
});

export const deleteRequeteStateRoute = openApiProtectedRoute({
  description: 'Delete a RequeteState and all its associated notes and files',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'RequeteState deleted successfully'),
  },
});
