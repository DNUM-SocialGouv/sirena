import { describe, expect, it } from 'vitest';
import { formatMesureProtectionPersonneConcernee, getMesureProtectionShortLabel } from './mesureProtection.utils.js';

describe('mesureProtection.utils', () => {
  it('returns only positive Mesure de protection short labels', () => {
    expect(getMesureProtectionShortLabel('MANDATAIRE_JUDICIAIRE')).toBe('mandataire judiciaire');
    expect(getMesureProtectionShortLabel('HABILITATION_FAMILIALE')).toBe('habilitation familiale');
    expect(getMesureProtectionShortLabel('NON')).toBeNull();
    expect(getMesureProtectionShortLabel(null)).toBeNull();
    expect(getMesureProtectionShortLabel(undefined)).toBeNull();
  });

  it('formats only positive Mesure de protection values for display', () => {
    expect(formatMesureProtectionPersonneConcernee('MANDATAIRE_JUDICIAIRE')).toBe(
      'Il/elle est sous mesure de protection : mandataire judiciaire',
    );
    expect(formatMesureProtectionPersonneConcernee('HABILITATION_FAMILIALE')).toBe(
      'Il/elle est sous mesure de protection : habilitation familiale',
    );
    expect(formatMesureProtectionPersonneConcernee('NON')).toBeNull();
    expect(formatMesureProtectionPersonneConcernee(null)).toBeNull();
    expect(formatMesureProtectionPersonneConcernee(undefined)).toBeNull();
  });
});
