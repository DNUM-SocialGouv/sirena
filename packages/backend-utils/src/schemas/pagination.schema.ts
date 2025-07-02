import { z } from '../utils/zod';

export const paginationQueryParamsSchema = (columns: readonly [string, ...string[]]) =>
  z.object({
    search: z.string().optional(),
    limit: z.coerce.number().optional(),
    offset: z.coerce.number().optional(),
    sort: z.enum(columns).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
