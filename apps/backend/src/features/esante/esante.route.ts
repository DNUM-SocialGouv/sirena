import { openApiProtectedRoute, openApiResponses } from '@sirena/backend-utils/helpers';
import { GetPractionnersResponseSchema } from './esante.schema';

export const getPractionnersRoute = openApiProtectedRoute({
  description: 'Get all practionners with esante',
  responses: {
    ...openApiResponses(GetPractionnersResponseSchema),
  },
});
