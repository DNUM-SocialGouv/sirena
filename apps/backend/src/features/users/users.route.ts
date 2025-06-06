import { openApi404NotFound } from '@/helpers/apiErrors';
import { openApiResponse, openApiResponses } from '@/helpers/apiResponses';
import { describeRoute } from 'hono-openapi';
import { z } from 'zod';
import { GetUserResponseSchema, GetUsersResponseSchema } from './users.schema';

export const GetUsersQuerySchema = z.object({
  roleId: z.string().optional(),
  active: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

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
