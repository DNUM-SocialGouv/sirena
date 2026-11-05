import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '@sirena/common/constants';
import { z } from 'zod';

const limitSchema = z.coerce.number().int().min(1).max(PAGINATION_MAX_LIMIT);
const offsetSchema = z.coerce.number().int().min(0);

/**
 * Bounded pagination: a query without `limit` still gets a page, which guarantees a SQL LIMIT
 * whoever the caller is.
 */
export const paginationQueryParamsSchema = (columns: readonly [string, ...string[]]) =>
  z.object({
    search: z.string().optional(),
    limit: limitSchema.default(PAGINATION_DEFAULT_LIMIT),
    offset: offsetSchema.default(0),
    sort: z.enum(columns).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });

/**
 * Variant for the lists the client consumes in full (entity selects): pagination stays opt-in,
 * but the values it does provide remain bounded.
 */
export const optionalPaginationQueryParamsSchema = (columns: readonly [string, ...string[]]) =>
  paginationQueryParamsSchema(columns).extend({
    limit: limitSchema.optional(),
    offset: offsetSchema.optional(),
  });
