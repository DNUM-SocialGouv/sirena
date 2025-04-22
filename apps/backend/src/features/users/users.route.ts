import { HTTPExceptionSchema } from '@/helpers/errors.ts';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import {
  deleteUserResponseSchema,
  getUserResponseSchema,
  getUsersResponseSchema,
  userParamsIdSchema,
} from './users.schema.ts';

export const getUserRoute = describeRoute({
  description: 'Get user by id',
  parameters: [
    {
      id: {
        description: 'User ID',
        required: true,
        schema: resolver(userParamsIdSchema),
      },
    },
  ],
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': { schema: resolver(getUserResponseSchema) },
      },
    },
  },
  errorHandler: {
    404: {
      description: 'User not found',
      content: {
        'application/json': { schema: resolver(HTTPExceptionSchema) },
      },
    },
  },
});

export const getUsersRoute = describeRoute({
  description: 'Get all users',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': { schema: resolver(getUsersResponseSchema) },
      },
    },
  },
});

export const postUserRoute = describeRoute({
  responses: {
    201: {
      description: 'Successful response',
      content: {
        'application/json': { schema: resolver(getUsersResponseSchema) },
      },
    },
  },
  errorHandler: {
    400: {
      description: 'Invalid payload',
      content: {
        'application/json': { schema: resolver(HTTPExceptionSchema) },
      },
    },
  },
});

export const deleteUserRoute = describeRoute({
  description: 'Delete user by id',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': { schema: resolver(deleteUserResponseSchema) },
      },
    },
  },
  errorHandler: {
    404: {
      description: 'User not found',
      content: {
        'application/json': { schema: resolver(HTTPExceptionSchema) },
      },
    },
  },
});
