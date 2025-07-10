import { z } from 'zod';

export const QueryParamsSchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
