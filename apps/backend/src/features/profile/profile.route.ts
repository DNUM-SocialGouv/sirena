import { openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { GetProfileResponseSchema } from './profile.schema.js';

export const getProfileRoute = openApiProtectedRoute({
  description: 'Get profile',
  responses: {
    ...openApiResponse(GetProfileResponseSchema),
  },
});
