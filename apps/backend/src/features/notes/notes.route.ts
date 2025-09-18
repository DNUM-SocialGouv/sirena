import { openApiDeleteResponse, openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { z } from 'zod';
import { RequeteEtapeNoteSchema } from '@/libs/zod';

export const addNoteRoute = openApiProtectedRoute({
  description: 'Add a processing note to a step of a request',
  responses: {
    ...openApiResponse(RequeteEtapeNoteSchema),
  },
});

export const updateNoteRoute = openApiProtectedRoute({
  description: 'Update the content of a processing note and optionally add new files',
  responses: {
    ...openApiResponse(RequeteEtapeNoteSchema),
  },
});

export const deleteNoteRoute = openApiProtectedRoute({
  description: 'Delete a processing note from a step of a request (and all its associated files)',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'Note deleted successfully'),
  },
});
