import { openApi401Unauthorized, openApiResponse } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { GetProfileResponseSchema } from './profile.schema';

// openApiProtectedRoute not working for openApiResponse duno why
// export const getProfileRoute = openApiProtectedRoute({
//   description: 'Get profile',
//   responses: {
//     ...openApiResponse(GetProfileResponseSchema),
//   },
// });

export const getProfileRoute = describeRoute({
  description: 'Get profile',
  responses: {
    ...openApi401Unauthorized('Unauthorized'),
    ...openApiResponse(GetProfileResponseSchema),
  },
});
