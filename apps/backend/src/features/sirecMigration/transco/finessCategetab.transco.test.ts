import { describe, expect, it } from 'vitest';
import { transcodeFinessCategetab } from './finessCategetab.transco.js';
import { SirecDataError, SirecTranscoError } from './sirecTransco.error.js';

describe('finessCategetab.transco.ts', () => {
  describe('Case A — MEC précision', () => {
    it('should return kind:mec with SAD_SOINS for categetab 354', () => {
      expect(transcodeFinessCategetab(354)).toEqual({ kind: 'mec', mecPrecisionId: 'SAD_SOINS' });
    });

    it('should return kind:mec with SESSAD for categetab 182', () => {
      expect(transcodeFinessCategetab(182)).toEqual({ kind: 'mec', mecPrecisionId: 'SESSAD' });
    });

    it('should return kind:mec with SAMSAH for categetab 445', () => {
      expect(transcodeFinessCategetab(445)).toEqual({ kind: 'mec', mecPrecisionId: 'SAMSAH' });
    });

    it('should return kind:mec with SAEMO for categetab 295', () => {
      expect(transcodeFinessCategetab(295)).toEqual({ kind: 'mec', mecPrecisionId: 'SAEMO' });
    });

    it('should return kind:mec with AUTRE for categetab 699', () => {
      expect(transcodeFinessCategetab(699)).toEqual({ kind: 'mec', mecPrecisionId: 'AUTRE' });
    });
  });

  describe('Case B — Lieu survenue type', () => {
    it('should return kind:lieu with ETABLISSEMENT_PERSONNES_AGEES for categetab 500', () => {
      expect(transcodeFinessCategetab(500)).toEqual({ kind: 'lieu', lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES' });
    });

    it('should return kind:lieu with ETABLISSEMENT_SANTE for categetab 355', () => {
      expect(transcodeFinessCategetab(355)).toEqual({ kind: 'lieu', lieuTypeId: 'ETABLISSEMENT_SANTE' });
    });

    it('should return kind:lieu with ETABLISSEMENT_HANDICAP for categetab 183', () => {
      expect(transcodeFinessCategetab(183)).toEqual({ kind: 'lieu', lieuTypeId: 'ETABLISSEMENT_HANDICAP' });
    });

    it('should return kind:lieu with ETABLISSEMENT_SOCIAL for categetab 177', () => {
      expect(transcodeFinessCategetab(177)).toEqual({ kind: 'lieu', lieuTypeId: 'ETABLISSEMENT_SOCIAL' });
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
