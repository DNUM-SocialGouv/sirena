import { OpenApi404NotFound } from '@/helpers/apiErrors.ts';
import { OpenApiResponse, OpenApiResponses } from '@/helpers/apiResponses.ts';
import { describeRoute } from 'hono-openapi';
import { GetUserResponseSchema, GetUsersResponseSchema } from './users.schema.ts';

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
