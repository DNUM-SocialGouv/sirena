import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { GetRequetesEntiteQuerySchema } from './requetesEntite.schema.js';

describe('GetRequetesEntiteQuerySchema - statutIds', () => {
  it('accepts a comma-separated list of valid statut ids', () => {
    const result = GetRequetesEntiteQuerySchema.safeParse({ statutIds: 'NOUVEAU,EN_COURS' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown statut id', () => {
    const result = GetRequetesEntiteQuerySchema.safeParse({ statutIds: 'NOUVEAU,HACK' });
    expect(result.success).toBe(false);
  });

  it('rejects an over-long value even when the ids are valid', () => {
    const result = GetRequetesEntiteQuerySchema.safeParse({ statutIds: 'NOUVEAU,'.repeat(70) });
    expect(result.success).toBe(false);
  });

  it('allows statutIds to be omitted', () => {
    const result = GetRequetesEntiteQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('GetRequetesEntiteQuerySchema - pagination', () => {
  it('applies the default page size when limit is omitted', () => {
    const result = GetRequetesEntiteQuerySchema.parse({});

    expect(result.limit).toBe(PAGINATION_DEFAULT_LIMIT);
    expect(result.offset).toBeUndefined();
  });

  it('coerces the limit and offset sent as query strings', () => {
    const result = GetRequetesEntiteQuerySchema.parse({ limit: '25', offset: '50' });

    expect(result.limit).toBe(25);
    expect(result.offset).toBe(50);
  });

  it('accepts the maximum limit', () => {
    expect(GetRequetesEntiteQuerySchema.parse({ limit: PAGINATION_MAX_LIMIT }).limit).toBe(PAGINATION_MAX_LIMIT);
  });

  it.each(['0', '-1', String(PAGINATION_MAX_LIMIT + 1), '1.5'])('rejects limit=%s', (limit) => {
    expect(GetRequetesEntiteQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it.each(['', '-1', '1.5'])('rejects offset=%s', (offset) => {
    expect(GetRequetesEntiteQuerySchema.safeParse({ offset }).success).toBe(false);
  });
});
