import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { GetEntitesListAdminQuerySchema, GetEntitiesQuerySchema } from './entites.schema.js';

describe('GetEntitiesQuerySchema - pagination', () => {
  it('leaves the pagination untouched: the entity selects consume the whole list', () => {
    const result = GetEntitiesQuerySchema.parse({});

    expect(result.limit).toBeUndefined();
    expect(result.offset).toBeUndefined();
  });

  it('still rejects an out-of-range limit', () => {
    expect(GetEntitiesQuerySchema.safeParse({ limit: PAGINATION_MAX_LIMIT + 1 }).success).toBe(false);
  });
});

describe('GetEntitesListAdminQuerySchema - pagination', () => {
  it('falls back to the bounded default page size', () => {
    const result = GetEntitesListAdminQuerySchema.parse({});

    expect(result.limit).toBe(PAGINATION_DEFAULT_LIMIT);
    expect(result.offset).toBe(0);
  });
});
