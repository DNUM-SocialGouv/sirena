import type { Motif } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSituationContextFromDemat } from './buildSituationContext';
import type { SituationContext } from './types';

vi.mock('./utils', () => ({
  extractPostalCode: vi.fn((v) => (v ? '75001' : null)),
  extractFinessFromRawText: vi.fn((v) => (v ? '123456789' : null)),
  extractProfessionDomicileTypeFromRawText: vi.fn((v) => (v ? 'SSIAD' : null)),
}));

describe('buildSituationContextFromDemat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // biome-ignore lint/suspicious/noExplicitAny: <tests purposes>
  const makeSituation = (partial: any = {}) => ({
    lieuDeSurvenue: {
      lieuTypeId: 'ETABLISSEMENT_SANTE',
      finess: 'FINESS RAW',
      adresse: {
        codePostal: '75001',
        label: 'Paris',
      },
      ...partial.lieuDeSurvenue,
    },
    misEnCause: {
      misEnCauseType: { id: 'PROFESSIONNEL_SANTE' },
      misEnCauseTypePrecision: { id: 'SSIAD' },
      ...partial.misEnCause,
    },
    faits: [
      {
        maltraitanceTypes: [{ maltraitanceType: { id: 'MALTRAITANCE' } }],
        motifsDeclaratifs: [{ motifDeclaratif: { id: 'PROBLEME_QUALITE_SOINS' as Motif } }],
        motifs: [{ motif: { id: 'NON_RESPECT_DROITS' as Motif } }],
      },
      ...(partial.faits || []),
    ],
    ...partial,
  });

  it('should extract basic context fields correctly', () => {
    const situation = makeSituation();
    const ctx: SituationContext = buildSituationContextFromDemat(situation);

    expect(ctx.lieuType).toBe('ETABLISSEMENT_SANTE');
    expect(ctx.finessCode).toBe('123456789');
    expect(ctx.postalCode).toBe('75001');
    expect(ctx.misEnCauseType).toBe('PROFESSIONNEL_SANTE');
    expect(ctx.professionDomicileType).toBe('SSIAD');
    expect(ctx.misEnCauseTypePrecision).toBe('SSIAD');
  });

  it('should detect maltraitance when at least one type is not NON or NE_SAIS_PAS', () => {
    const ctx = buildSituationContextFromDemat(makeSituation());
    expect(ctx.isMaltraitance).toBe(true);
  });

  it('should detect non-maltraitance when all faits have NON or NE_SAIS_PAS', () => {
    const situation = makeSituation({
      faits: [
        {
          maltraitanceTypes: [{ maltraitanceType: { id: 'NON' } }],
        },
      ],
    });

    const ctx = buildSituationContextFromDemat(situation);
    expect(ctx.isMaltraitance).toBe(false);
  });

  it('should extract motifsDeclaratifs and motifs', () => {
    const ctx = buildSituationContextFromDemat(makeSituation());

    expect(ctx.motifsDeclaratifs).toEqual(['PROBLEME_QUALITE_SOINS']);
    expect(ctx.motifs).toEqual(['NON_RESPECT_DROITS']);
  });

  it('should handle empty or missing faits gracefully', () => {
    const ctx = buildSituationContextFromDemat(makeSituation({ faits: [] }));

    expect(ctx.isMaltraitance).toBe(false);
    expect(ctx.motifs).toEqual([]);
    expect(ctx.motifsDeclaratifs).toEqual([]);
  });

  it('should handle missing nested fields safely', () => {
    const situation = makeSituation({
      lieuDeSurvenue: { adresse: null, finess: null },
      misEnCause: { misEnCauseType: null, misEnCauseTypePrecision: null },
    });

    const ctx = buildSituationContextFromDemat(situation);

    expect(ctx.finessCode).toBe(null);
    expect(ctx.postalCode).toBe(null);
    expect(ctx.misEnCauseType).toBe(undefined);
    expect(ctx.professionDomicileType).toBe(null);
    expect(ctx.misEnCauseTypePrecision).toBe(undefined);
  });
});
