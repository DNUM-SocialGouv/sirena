import { openApiProtectedRoute, openApiResponses } from '@sirena/backend-utils/helpers';
import { GetRequetesEntiteResponseSchema } from './requetesEntite.schema';

export const getRequetesEntiteRoute = openApiProtectedRoute({
  description: 'Get requetes entites',
  responses: {
    ...openApiResponses(GetRequetesEntiteResponseSchema),
  },
});
