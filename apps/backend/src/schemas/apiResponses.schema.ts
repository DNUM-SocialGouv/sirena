import { z } from 'zod';
import 'zod-openapi/extend';

export const MetaSchema = z.object({
  total: z.optional(z.number()),
  offset: z.optional(z.number()),
  limit: z.optional(z.number()),
});
