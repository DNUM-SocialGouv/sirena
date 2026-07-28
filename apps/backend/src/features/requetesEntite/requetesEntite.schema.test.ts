import { RECEPTION_TYPE } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import {
  CreateRequeteBodySchema,
  GetRequetesEntiteQuerySchema,
  UpdateTypeAndDateRequeteBodySchema,
} from './requetesEntite.schema.js';

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

describe('receptionTypeId validation - creation vs edition', () => {
  it('accepts a UI-selectable reception type at creation', () => {
    const result = CreateRequeteBodySchema.safeParse({ receptionTypeId: RECEPTION_TYPE.EMAIL });
    expect(result.success).toBe(true);
  });

  it('rejects a SIREC-only reception type at creation', () => {
    const result = CreateRequeteBodySchema.safeParse({ receptionTypeId: RECEPTION_TYPE.INFO_MEDIA });
    expect(result.success).toBe(false);
  });

  it('accepts a SIREC-only reception type when editing a migrated request', () => {
    const result = UpdateTypeAndDateRequeteBodySchema.safeParse({ receptionTypeId: RECEPTION_TYPE.INFO_MEDIA });
    expect(result.success).toBe(true);
  });
});
