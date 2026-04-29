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
