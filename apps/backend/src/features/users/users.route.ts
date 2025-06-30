import { z } from '@/libs/zod';
import { openApi404NotFound, openApiProtectedRoute } from '@sirena/backend-utils/helpers';
import { openApiResponse, openApiResponses } from '@sirena/backend-utils/helpers';
import { GetUserResponseSchema, GetUsersResponseSchema } from './users.schema';

export const getUserRoute = openApiProtectedRoute({
  description: 'Get user by id',
  responses: {
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
