import { openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { RequeteStateNoteSchema, RequeteStateSchema } from '@/libs/zod';

export const updateRequeteStateStatutRoute = openApiProtectedRoute({
  description: 'Update the statut of a RequeteState',
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
