import { z } from 'zod';

export const QueryParamsSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.string().optional(),
  offset: z.coerce.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
