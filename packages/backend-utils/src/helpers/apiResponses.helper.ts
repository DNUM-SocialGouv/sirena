import type { ResolverReturnType } from 'hono-openapi';
import { describeRoute, resolver } from 'hono-openapi';
import type { OpenAPIV3 } from 'openapi-types';
import { type ZodType, z } from 'zod';
import { MetaSchema } from '../schemas/apiResponses.schema.js';
import { openApi401Unauthorized } from './apiErrors.helper.js';

type OpenApiResponse = {
  [code: number]: {
    description: string;
    content: {
      'application/json': {
        schema: ResolverReturnType;
      };
    };
  };
};

export const apiResponseRawResolver = <T extends ZodType>(schema: T): ResolverReturnType => resolver(schema);

export const apiResponsesResolver = <T extends ZodType>(schema: T): ResolverReturnType =>
  resolver(
    z.object({
      data: schema,
      meta: z.optional(MetaSchema),
    }),
  );

export const apiResponseResolver = <T extends ZodType>(schema: T): ResolverReturnType =>
  resolver(
    z.object({
      data: schema,
    }),
  );

export const apiDeleteResponseResolver = <T extends ZodType>(id: T): ResolverReturnType =>
  resolver(
    z.object({
      data: z.object({
        id,
        deleted: z.boolean(),
      }),
    }),
  );

export const openApiRawResponse = <T extends ZodType>(schema: T, code = 200, description = 'Successful response') => ({
  [code]: {
    description,
    content: {
      'application/json': { schema: apiResponseRawResolver(schema) },
    },
  },
});

export const openApiResponses = <T extends ZodType>(schema: T, code = 200, description = 'Successful response') => ({
  [code]: {
    description,
    content: {
      'application/json': { schema: apiResponsesResolver(schema) },
    },
  },
});

export const openApiResponse = <T extends ZodType>(schema: T, code = 200, description = 'Successful response') => ({
  [code]: {
    description,
    content: {
      'application/json': { schema: apiResponseResolver(schema) },
    },
  },
});

export const openApiRedirect = (code = 302, description = 'Redirect') => ({
  [code]: {
    description,
    headers: {
      Location: {
        description: 'Redirection url',
      },
    },
  },
});

export const openApiDeleteResponse = <T extends ZodType>(id: T, code = 200, description = 'Successful response') => ({
  [code]: {
    description,
    content: {
      'application/json': { schema: apiDeleteResponseResolver(id) },
    },
  },
});

type OpenApiProtectedRouteParams = {
  description: string;
  responses: OpenApiResponse;
  parameters?: OpenAPIV3.ParameterObject[];
  tags?: string[];
};

export const openApiProtectedRoute = ({
  description,
  responses,
  tags = [],
  parameters = [],
}: OpenApiProtectedRouteParams) =>
  describeRoute({
    description,
    tags,
    parameters,
    responses: {
      ...openApi401Unauthorized('Unauthorized'),
      ...responses,
    },
  });
