import { openApi409Conflict, openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import { CguAcceptanceResponseSchema, GetProfileResponseSchema } from './profile.schema.js';

export const getProfileRoute = openApiProtectedRoute({
  description: 'Get profile',
  responses: {
    ...openApiResponse(GetProfileResponseSchema),
  },
});

export const postCguAcceptanceRoute = openApiProtectedRoute({
  description: 'Accept the CGU version in force',
  responses: {
    ...openApiResponse(CguAcceptanceResponseSchema),
    ...openApi409Conflict('Outdated CGU version'),
  },
});
