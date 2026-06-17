import { describe, expect, it } from 'vitest';
import { transcodeFinessCategetab } from './finessCategetab.transco.js';
import { SirecDataError, SirecTranscoError } from './sirecTransco.error.js';

describe('finessCategetab.transco.ts', () => {
  describe('Case A — MEC précision (pas de lieu survenu)', () => {
    it('should return SAD_SOINS precision for categetab 354', () => {
      expect(transcodeFinessCategetab(354)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'SAD_SOINS' },
      });
    });

    it('should return SESSAD precision for categetab 182', () => {
      expect(transcodeFinessCategetab(182)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'SESSAD' },
      });
    });

    it('should return SAMSAH precision for categetab 445', () => {
      expect(transcodeFinessCategetab(445)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'SAMSAH' },
      });
    });

    it('should return SAEMO precision for categetab 295', () => {
      expect(transcodeFinessCategetab(295)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'SAEMO' },
      });
    });

    it('should return AUTRE precision for categetab 699', () => {
      expect(transcodeFinessCategetab(699)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'AUTRE' },
      });
    });

    it('should not include lieuSurvenue for categetab 354', () => {
      const entry = transcodeFinessCategetab(354);
      expect(entry.lieuSurvenue).toBeUndefined();
    });
  });

  describe('Case B — Lieu survenue (précision ETABLISSEMENT)', () => {
    it('should return ETABLISSEMENT_PERSONNES_AGEES with EHPAD for categetab 500', () => {
      expect(transcodeFinessCategetab(500)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'ETABLISSEMENT' },
        lieuSurvenue: { lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES', lieuPrecision: 'EHPAD' },
      });
    });

    it('should return ETABLISSEMENT_SANTE with CH for categetab 355', () => {
      expect(transcodeFinessCategetab(355)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'ETABLISSEMENT' },
        lieuSurvenue: { lieuTypeId: 'ETABLISSEMENT_SANTE', lieuPrecision: 'CH' },
      });
    });

    it('should return ETABLISSEMENT_HANDICAP with IME for categetab 183', () => {
      expect(transcodeFinessCategetab(183)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'ETABLISSEMENT' },
        lieuSurvenue: { lieuTypeId: 'ETABLISSEMENT_HANDICAP', lieuPrecision: 'IME' },
      });
    });

    it('should return ETABLISSEMENT_SOCIAL with MECS for categetab 177', () => {
      expect(transcodeFinessCategetab(177)).toEqual({
        misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', misEnCauseTypePrecisionId: 'ETABLISSEMENT' },
        lieuSurvenue: { lieuTypeId: 'ETABLISSEMENT_SOCIAL', lieuPrecision: 'MECS' },
      });
    });
  });

  describe('error cases', () => {
    it('should throw SirecDataError when categetab is null', () => {
      expect(() => transcodeFinessCategetab(null)).toThrow(SirecDataError);
    });

    it('should throw SirecTranscoError when categetab is unknown', () => {
      expect(() => transcodeFinessCategetab(9999)).toThrow(SirecTranscoError);
    });
  });
});
