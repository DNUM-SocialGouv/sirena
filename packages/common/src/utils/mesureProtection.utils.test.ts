import { describe, expect, it } from 'vitest';
import { formatMesureProtectionPersonneConcernee } from './mesureProtection.utils.js';

describe('mesureProtection.utils', () => {
  it('formats only positive Mesure de protection values for display', () => {
    expect(formatMesureProtectionPersonneConcernee('MANDATAIRE_JUDICIAIRE')).toBe(
      'La personne concernée est sous mesure de protection : mandataire judiciaire',
    );
    expect(formatMesureProtectionPersonneConcernee('HABILITATION_FAMILIALE')).toBe(
      'La personne concernée est sous mesure de protection : habilitation familiale',
    );
    expect(formatMesureProtectionPersonneConcernee('NON')).toBeNull();
    expect(formatMesureProtectionPersonneConcernee(null)).toBeNull();
    expect(formatMesureProtectionPersonneConcernee(undefined)).toBeNull();
  });
});
