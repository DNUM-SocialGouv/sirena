import { z } from 'zod';

export const TestResponseSchema = z.object({
  message: z.string(),
  accountId: z.string(),
  keyPrefix: z.string(),
  traceId: z.string(),
});

export const TestErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    traceId: z.string(),
    retryAfter: z.number().optional(),
  }),
});

export type TestResponse = z.infer<typeof TestResponseSchema>;
export type TestErrorResponse = z.infer<typeof TestErrorResponseSchema>;
