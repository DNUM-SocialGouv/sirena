import { createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';

import { HTTPExceptionSchema } from '@/helpers/errors.ts';
import {
  deleteUserResponseSchema,
  getUserResponseSchema,
  getUsersResponseSchema,
  postUserRequestSchema,
  postUserResponseSchema,
  userParamsIdSchema,
} from './users.schema.ts';

export const getUsersRoute = createRoute({
  method: 'get',
  path: '/users/',
  description: 'Get users',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: getUsersResponseSchema,
        },
      },
      description: 'Retrieve users',
    },
  },
});

export const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  request: {
    params: userParamsIdSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: getUserResponseSchema,
        },
      },
      description: 'Retrieve the user',
    },
    404: {
      content: {
        'application/json': {
          schema: HTTPExceptionSchema,
        },
      },
      description: 'User not found',
    },
  },
});

export const postUserRoute = createRoute({
  method: 'post',
  path: '/users/',
  description: 'Create user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: postUserRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: postUserResponseSchema,
        },
      },
      description: 'User created',
    },
    400: {
      description: 'Invalid payload',
      content: {
        'application/json': { schema: HTTPExceptionSchema },
      },
    },
  },
});

export const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/users/{id}',
  description: 'Delete user by id',
  request: {
    params: userParamsIdSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: deleteUserResponseSchema,
        },
      },
      description: 'User deleted',
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': { schema: HTTPExceptionSchema },
      },
    },
  },
});
