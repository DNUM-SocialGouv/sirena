import { MALTRAITANCE_PARENT_VALUE } from '@sirena/common/constants';

const NEGATIVE_MALTRAITANCE_ANSWERS = ['NON', 'NE_SAIS_PAS'];

type FaitWithMotifs = {
  motifs?: Array<{ motif?: { id?: string }; motifId?: string }> | null;
  maltraitanceTypes?: Array<{
    maltraitanceType?: { id?: string };
    maltraitanceTypeId?: string;
  }> | null;
};

type SituationWithFaits = {
  faits?: FaitWithMotifs[] | null;
};

/**
 * Declarant has filled in at least one maltraitance motif (excluding NON) in demat.social
 */
export function hasMaltraitanceDeclarant(situation: SituationWithFaits | null | undefined): boolean {
  return !!situation?.faits?.some((f) =>
    f.maltraitanceTypes?.some((m) => {
      const maltraitanceId = m.maltraitanceType?.id ?? m.maltraitanceTypeId ?? '';
      return maltraitanceId && !NEGATIVE_MALTRAITANCE_ANSWERS.includes(maltraitanceId);
    }),
  );
}

/**
 * At least one motif qualified by the agent in this situation
 */
export function hasAnyQualifiedMotif(situation: SituationWithFaits | null | undefined): boolean {
  return !!situation?.faits?.some((f) => (f.motifs?.length ?? 0) > 0);
}

/**
 * At least one qualified motif is "Maltraitance professionnels ou entourage"
 */
export function hasMaltraitanceQualified(situation: SituationWithFaits | null | undefined): boolean {
  return !!situation?.faits?.some((f) =>
    f.motifs?.some((m) => {
      const motifId = m?.motif?.id ?? m?.motifId ?? '';
      return motifId.startsWith(`${MALTRAITANCE_PARENT_VALUE}/`);
    }),
  );
}

/**
 * Checks if a situation should have the maltraitance tag.
 */
export function situationHasMaltraitanceTag(situation: SituationWithFaits | null | undefined): boolean {
  const hasDeclarantMaltraitance = hasMaltraitanceDeclarant(situation);
  const hasQualifiedMotifs = hasAnyQualifiedMotif(situation);
  const hasQualifiedMaltraitance = hasMaltraitanceQualified(situation);

  if (hasQualifiedMotifs) {
    return hasQualifiedMaltraitance;
  }

  return hasDeclarantMaltraitance;
}
