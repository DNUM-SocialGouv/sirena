import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { GetUsersQuerySchema } from './users.schema.js';

describe('GetUsersQuerySchema', () => {
  it.each(['createdAt', 'entite.nomComplet', 'role.label', 'statutId'])('accepts %s as user sort key', (sort) => {
    const result = GetUsersQuerySchema.safeParse({ sort, order: 'asc' });

    expect(result.success).toBe(true);
  });

  it('rejects unknown user sort keys', () => {
    const result = GetUsersQuerySchema.safeParse({ sort: 'unknown', order: 'asc' });

    expect(result.success).toBe(false);
  });
});

describe('GetUsersQuerySchema - pagination', () => {
  it('applies the bounded default page size when the pagination is omitted', () => {
    const result = GetUsersQuerySchema.parse({});

    expect(result.limit).toBe(PAGINATION_DEFAULT_LIMIT);
    expect(result.offset).toBe(0);
  });

  it('coerces the limit and offset sent as query strings', () => {
    const result = GetUsersQuerySchema.parse({ limit: '25', offset: '50' });

    expect(result.limit).toBe(25);
    expect(result.offset).toBe(50);
  });

  it.each([0, -1, PAGINATION_MAX_LIMIT + 1, 1.5])('rejects limit=%s', (limit) => {
    expect(GetUsersQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it.each([-1, 1.5])('rejects offset=%s', (offset) => {
    expect(GetUsersQuerySchema.safeParse({ offset }).success).toBe(false);
  });
});
