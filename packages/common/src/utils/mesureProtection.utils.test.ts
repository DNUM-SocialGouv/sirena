import { describe, expect, it } from 'vitest';
import { formatMesureProtectionPersonneConcernee, getMesureProtectionShortLabel } from './mesureProtection.utils.js';

describe('mesureProtection.utils', () => {
  it('returns only positive Mesure de protection short labels', () => {
    expect(getMesureProtectionShortLabel('MANDATAIRE_JUDICIAIRE')).toBe('mandataire judiciaire');
    expect(getMesureProtectionShortLabel('MANDATAIRE_FAMILIAL')).toBe('mandataire familial');
    expect(getMesureProtectionShortLabel('NON')).toBeNull();
    expect(getMesureProtectionShortLabel(null)).toBeNull();
    expect(getMesureProtectionShortLabel(undefined)).toBeNull();
  });

  it('formats only positive Mesure de protection values for display', () => {
    expect(formatMesureProtectionPersonneConcernee('MANDATAIRE_JUDICIAIRE')).toBe(
      'Il/elle est en mesure de protection : mandataire judiciaire',
    );
    expect(formatMesureProtectionPersonneConcernee('MANDATAIRE_FAMILIAL')).toBe(
      'Il/elle est en mesure de protection : mandataire familial',
    );
    expect(formatMesureProtectionPersonneConcernee('NON')).toBeNull();
    expect(formatMesureProtectionPersonneConcernee(null)).toBeNull();
    expect(formatMesureProtectionPersonneConcernee(undefined)).toBeNull();
  });
});
