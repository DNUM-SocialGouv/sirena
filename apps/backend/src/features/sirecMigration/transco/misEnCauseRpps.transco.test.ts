import { describe, expect, it } from 'vitest';
import { transcodeCiviliteRpps, transcodeLibelleProfRpps } from './misEnCauseRpps.transco.js';

describe('misEnCauseRpps.transco.ts', () => {
  describe('transcodeCiviliteRpps', () => {
    it('should return MME for "mme"', () => {
      expect(transcodeCiviliteRpps('mme')).toBe('MME');
    });

    it('should return MME for "mlle"', () => {
      expect(transcodeCiviliteRpps('mlle')).toBe('MME');
    });

    it('should return M for "m"', () => {
      expect(transcodeCiviliteRpps('m')).toBe('M');
    });

    it('should return empty string for null', () => {
      expect(transcodeCiviliteRpps(null)).toBe('');
    });

    it('should return empty string for unknown civilite', () => {
      expect(transcodeCiviliteRpps('dr')).toBe('');
    });
  });

  describe('transcodeLibelleProfRpps', () => {
    it('should return PROFESSIONNEL_SANTE / AUTRE for "Médecin"', () => {
      expect(transcodeLibelleProfRpps('Médecin')).toEqual({
        misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
        misEnCauseTypePrecisionId: 'AUTRE',
      });
    });

    it('should return PROFESSIONNEL_SANTE / INFIRMIER for "Infirmier"', () => {
      expect(transcodeLibelleProfRpps('Infirmier')).toEqual({
        misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
        misEnCauseTypePrecisionId: 'INFIRMIER',
      });
    });

    it('should return PROFESSIONNEL_SANTE / PHARMACIEN for "Pharmacien"', () => {
      expect(transcodeLibelleProfRpps('Pharmacien')).toEqual({
        misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
        misEnCauseTypePrecisionId: 'PHARMACIEN',
      });
    });

    it('should return PROFESSIONNEL_SANTE / SAGE_FEMME for "Sage-Femme"', () => {
      expect(transcodeLibelleProfRpps('Sage-Femme')).toEqual({
        misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
        misEnCauseTypePrecisionId: 'SAGE_FEMME',
      });
    });

    it('should return PROFESSIONNEL_SOCIAL / ASSISTANT_SOCIAL for "Assistant social"', () => {
      expect(transcodeLibelleProfRpps('Assistant social')).toEqual({
        misEnCauseTypeId: 'PROFESSIONNEL_SOCIAL',
        misEnCauseTypePrecisionId: 'ASSISTANT_SOCIAL',
      });
    });

    it('should return AUTRE_PROFESSIONNEL / PSYCHOLOGUE for "Psychologue"', () => {
      expect(transcodeLibelleProfRpps('Psychologue')).toEqual({
        misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
        misEnCauseTypePrecisionId: 'PSYCHOLOGUE',
      });
    });

    it('should return AUTRE_PROFESSIONNEL / ORTHESISTE for "Orthopédiste-Orthésiste"', () => {
      expect(transcodeLibelleProfRpps('Orthopédiste-Orthésiste')).toEqual({
        misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
        misEnCauseTypePrecisionId: 'ORTHESISTE',
      });
    });

    it('should return fallback AUTRE_PROFESSIONNEL / AUTRE for null', () => {
      expect(transcodeLibelleProfRpps(null)).toEqual({
        misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
        misEnCauseTypePrecisionId: 'AUTRE',
      });
    });

    it('should return fallback AUTRE_PROFESSIONNEL / AUTRE for empty string', () => {
      expect(transcodeLibelleProfRpps('')).toEqual({
        misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
        misEnCauseTypePrecisionId: 'AUTRE',
      });
    });

    it('should return fallback AUTRE_PROFESSIONNEL / AUTRE for unknown libelle', () => {
      expect(transcodeLibelleProfRpps('Profession inconnue')).toEqual({
        misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
        misEnCauseTypePrecisionId: 'AUTRE',
      });
    });
  });
});
