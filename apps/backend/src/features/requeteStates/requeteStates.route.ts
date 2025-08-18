import { openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { RequeteStateSchema } from '@/libs/zod';

export const updateRequeteStateStatutRoute = openApiProtectedRoute({
  description: 'Update the statut of a RequeteState',
  responses: {
    ...openApiResponse(RequeteStateSchema),
  },
});
