import type { Motif } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSituationContext } from './buildSituationContext.js';
import type { SituationContext } from './types.js';

vi.mock('./utils.js', () => ({
  extractPostalCode: vi.fn((v) => (v ? '75001' : null)),
  extractFinessFromRawText: vi.fn((v) => (v ? '123456789' : null)),
}));

describe('buildSituationContext', () => {
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
        maltraitanceTypes: [{ maltraitanceType: { id: 'NEGLIGENCES' } }],
        motifsDeclaratifs: [{ motifDeclaratif: { id: 'PROBLEME_QUALITE_SOINS' as Motif } }],
        motifs: [{ motif: { id: 'NON_RESPECT_DROITS' as Motif } }],
      },
      ...(partial.faits || []),
    ],
    ...partial,
  });

  it('should extract basic context fields correctly', () => {
    const situation = makeSituation();
    const ctx: SituationContext = buildSituationContext(situation);

    expect(ctx.lieuType).toBe('ETABLISSEMENT_SANTE');
    expect(ctx.finessCode).toBe('123456789');
    expect(ctx.postalCode).toBe('75001');
    expect(ctx.misEnCauseType).toBe('PROFESSIONNEL_SANTE');
    expect(ctx.misEnCauseTypePrecision).toBe('SSIAD');
  });

  it('should detect maltraitance when at least one positive type is present (NEGLIGENCES, VIOLENCES, MATERIELLE_FINANCIERE, SEXUELLE)', () => {
    const situation = makeSituation({
      faits: [
        {
          maltraitanceTypes: [{ maltraitanceType: { id: 'NEGLIGENCES' } }],
          motifsDeclaratifs: [{ motifDeclaratif: { id: 'PROBLEME_QUALITE_SOINS' as Motif } }],
          motifs: [{ motif: { id: 'NON_RESPECT_DROITS' as Motif } }],
        },
      ],
    });
    const ctx = buildSituationContext(situation);
    expect(ctx.isMaltraitance).toBe(true);
  });

  it('should detect non-maltraitance when all faits have NON', () => {
    const situation = makeSituation({
      faits: [
        {
          maltraitanceTypes: [{ maltraitanceType: { id: 'NON' } }],
        },
      ],
    });

    const ctx = buildSituationContext(situation);
    expect(ctx.isMaltraitance).toBe(false);
  });

  it('should detect non-maltraitance when no positive types are present', () => {
    const situation = makeSituation({
      faits: [
        {
          maltraitanceTypes: [{ maltraitanceType: { id: 'UNKNOWN_TYPE' } }],
        },
      ],
    });

    const ctx = buildSituationContext(situation);
    expect(ctx.isMaltraitance).toBe(false);
  });

  it('should detect maltraitance for all positive types', () => {
    const positiveTypes = ['NEGLIGENCES', 'VIOLENCES', 'MATERIELLE_FINANCIERE', 'SEXUELLE'] as const;

    for (const type of positiveTypes) {
      const situation = makeSituation({
        faits: [
          {
            maltraitanceTypes: [{ maltraitanceType: { id: type } }],
          },
        ],
      });

      const ctx = buildSituationContext(situation);
      expect(ctx.isMaltraitance).toBe(true);
    }
  });

  it('should extract motifsDeclaratifs', () => {
    const ctx = buildSituationContext(makeSituation());

    expect(ctx.motifsDeclaratifs).toEqual(['PROBLEME_QUALITE_SOINS']);
  });

  it('should handle empty or missing faits gracefully', () => {
    const ctx = buildSituationContext(makeSituation({ faits: [] }));

    expect(ctx.isMaltraitance).toBe(false);
    expect(ctx.motifsDeclaratifs).toEqual([]);
  });

  it('should handle missing nested fields safely', () => {
    const situation = makeSituation({
      lieuDeSurvenue: { adresse: null, finess: null },
      misEnCause: { misEnCauseType: null, misEnCauseTypePrecision: null },
    });

    const ctx = buildSituationContext(situation);

    expect(ctx.finessCode).toBe(null);
    expect(ctx.postalCode).toBe(null);
    expect(ctx.misEnCauseType).toBe(undefined);
    expect(ctx.misEnCauseTypePrecision).toBe(undefined);
  });
});
