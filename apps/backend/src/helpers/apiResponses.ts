import type { ResolverResult } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { type ZodSchema, z } from 'zod';
import 'zod-openapi/extend';

import { MetaSchema } from '@/schemas/apiResponses.schema.ts';

export const ApiResponsesSchema = <T extends ZodSchema>(schema: T): ResolverResult =>
  resolver(
    z.object({
      data: schema,
      meta: z.optional(MetaSchema),
    }),
  );

export const ApiResponseSchema = <T extends ZodSchema>(schema: T): ResolverResult =>
  resolver(
    z.object({
      data: schema,
    }),
  );

export const ApiDeleteResponseSchema = <T extends ZodSchema>(id: T): ResolverResult =>
  resolver(
    z.object({
      data: z.object({
        id,
        deleted: z.boolean(),
      }),
    }),
  );

export const OpenApiResponses = <T extends ZodSchema>(schema: T, code = 200, description = 'Successful response') => ({
  [code]: {
    description,
    content: {
      'application/json': { schema: ApiResponsesSchema(schema) },
    },
  },
});

export const OpenApiResponse = <T extends ZodSchema>(schema: T, code = 200, description = 'Successful response') => ({
  [code]: {
    description,
    content: {
      'application/json': { schema: ApiResponseSchema(schema) },
    },
  },
});

export const OpenApiDeleteResponse = <T extends ZodSchema>(id: T, code = 200, description = 'Successful response') => ({
  [code]: {
    description,
    content: {
      'application/json': { schema: ApiDeleteResponseSchema(id) },
    },
  },
});
