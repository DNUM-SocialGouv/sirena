import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
});

export const HealthErrorResponseSchema = z.object({
  status: z.literal('error'),
  message: z.string(),
});
