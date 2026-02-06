import { z } from 'zod';

export const TestResponseSchema = z.object({
  message: z.string(),
  accountId: z.string(),
  keyPrefix: z.string(),
  traceId: z.string(),
});

export const TestErrorResponseSchema = z.object({
  message: z.string(),
});

export type TestResponse = z.infer<typeof TestResponseSchema>;
