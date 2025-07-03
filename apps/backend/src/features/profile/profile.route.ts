import { openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { GetProfileResponseSchema } from './profile.schema';

export const getProfileRoute = openApiProtectedRoute({
  description: 'Get profile',
  responses: {
    ...openApiResponse(GetProfileResponseSchema),
  },
});
