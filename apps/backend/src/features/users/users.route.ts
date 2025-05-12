import { OpenApi400ZodError, OpenApi404NotFound } from '@/helpers/apiErrors.ts';
import { OpenApiDeleteResponse, OpenApiResponse, OpenApiResponses } from '@/helpers/apiResponses.ts';
import { describeRoute } from 'hono-openapi';
import { GetUserResponseSchema, GetUsersResponseSchema, UserIdSchema } from './users.schema.ts';

export const getUserRoute = describeRoute({
  description: 'Get user by id',
  responses: {
    ...OpenApiResponse(GetUserResponseSchema),
    ...OpenApi404NotFound('User not found'),
  },
});

export const getUsersRoute = describeRoute({
  description: 'Get all users',
  responses: {
    ...OpenApiResponses(GetUsersResponseSchema),
  },
});

export const postUserRoute = describeRoute({
  responses: {
    ...OpenApiResponse(GetUserResponseSchema, 201),
    ...OpenApi400ZodError('Invalid payload'),
  },
});

export const deleteUserRoute = describeRoute({
  description: 'Delete user by id',
  responses: {
    ...OpenApiDeleteResponse(UserIdSchema),
    ...OpenApi404NotFound('User not found'),
  },
});
