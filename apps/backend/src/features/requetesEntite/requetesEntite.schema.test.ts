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
