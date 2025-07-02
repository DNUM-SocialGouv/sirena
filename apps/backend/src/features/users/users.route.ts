import {
  openApi401Unauthorized,
  openApi404NotFound,
  openApiProtectedRoute,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { GetUserResponseSchema, GetUsersResponseSchema } from './users.schema';

// openApiProtectedRoute not working for openApiResponse duno why
// export const getUserRoute = openApiProtectedRoute({
//   description: 'Get user by id',
//   responses: {
//     ...openApiResponse(GetUserResponseSchema),
//     // ...openApi404NotFound('User not found'),
//   },
// });

export const getUserRoute = describeRoute({
  description: 'Get user by id',
  responses: {
    ...openApi401Unauthorized('Unauthorized'),
    ...openApiResponse(GetUserResponseSchema),
    ...openApi404NotFound('User not found'),
  },
});

export const getUsersRoute = openApiProtectedRoute({
  description: 'Get all users',
  responses: {
    ...openApiResponses(GetUsersResponseSchema),
  },
});

export const patchUserRoute = openApiProtectedRoute({
  description: 'Patch user by id',
  responses: {
    ...openApiResponse(GetUserResponseSchema),
    ...openApi404NotFound('User not found'),
  },
});
