import { openApi404NotFound } from '@/helpers/apiErrors';
import { openApiResponse, openApiResponses } from '@/helpers/apiResponses';
import { describeRoute } from 'hono-openapi';
import { GetUserResponseSchema, GetUsersResponseSchema } from './users.schema';

export const getUserRoute = describeRoute({
  description: 'Get user by id',
  responses: {
    ...openApiResponse(GetUserResponseSchema),
    ...openApi404NotFound('User not found'),
  },
});

export const getUsersRoute = describeRoute({
  description: 'Get all users',
  responses: {
    ...openApiResponses(GetUsersResponseSchema),
  },
});
