import { describe, expect, it } from 'vitest';
import { MIS_EN_CAUSE_ETABLISSEMENT_PRECISION, misEnCauseEtablissementPrecisionLabels } from './requete.constant.js';

describe('requete constants', () => {
  describe('establishment accused party precision referential', () => {
    it('exposes the new SAD precisions and removes the old generic service precision', () => {
      expect(MIS_EN_CAUSE_ETABLISSEMENT_PRECISION).toEqual(
        expect.objectContaining({
          SAD_MIXTE: 'SAD_MIXTE',
          SAD_SOINS: 'SAD_SOINS',
          SAD_SANTE: 'SAD_SANTE',
        }),
      );
      expect(misEnCauseEtablissementPrecisionLabels).toEqual(
        expect.objectContaining({
          SAD_MIXTE: 'SAD mixte',
          SAD_SOINS: 'SAD Soins',
          SAD_SANTE: 'SAD Santé',
        }),
      );
    });
  });
});
