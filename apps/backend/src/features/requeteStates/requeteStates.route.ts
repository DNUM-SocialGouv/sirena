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

export const updateRequeteStatesNoteRoute = openApiProtectedRoute({
  description: 'Update the content of a processing note and optionally add new files',
  responses: {
    ...openApiResponse(RequeteStateNoteSchema),
  },
});

export const deleteRequeteStatesNoteRoute = openApiProtectedRoute({
  description: 'Delete a processing note from a step of a request (and all its associated files)',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'Note deleted successfully'),
  },
});

export const deleteRequeteStateRoute = openApiProtectedRoute({
  description: 'Delete a RequeteState and all its associated notes and files',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'RequeteState deleted successfully'),
  },
});
