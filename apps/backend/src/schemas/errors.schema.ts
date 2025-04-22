import * as z from 'zod';
import 'zod-openapi/extend';

export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
