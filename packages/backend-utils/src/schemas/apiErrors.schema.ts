import { z } from 'zod';

export const ErrorSchema = z.object({
  message: z.string(),
  cause: z
    .object({
      name: z.string().optional(),
      message: z.string().optional(),
      stack: z.string().optional(),
    })
    .optional(),
});

const ZodIssueSchema = z.object({
  code: z.string(),
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  expected: z.any().optional(),
  received: z.any().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  inclusive: z.boolean().optional(),
  multipleOf: z.number().optional(),
  unionErrors: z.array(z.unknown()).optional(),
});

export const ZodErrorSchema = z.object({
  issues: z.array(ZodIssueSchema),
  name: z.string(),
});

export const ZodSafeParseErrorSchema = z.object({
  error: ZodErrorSchema,
  success: z.boolean(),
});
