import { describe, expect, it, vi } from 'vitest';
import type { SirecFinessData } from '../sirecMigration.repository.js';
import { SirecDataError, SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecFiness } from './sirecMigration.finess.transformer.js';

vi.mock('../transco/finessCategetab.transco.js', () => ({
  transcodeFinessCategetab: vi.fn((categetab: number | null) => {
    if (categetab === null) throw new SirecDataError('categetab null');
    if (categetab === 354) return { kind: 'mec', mecPrecisionId: 'SAD_SOINS' };
    if (categetab === 500) return { kind: 'lieu', lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES' };
    if (categetab === 355) return { kind: 'lieu', lieuTypeId: 'ETABLISSEMENT_SANTE' };
    throw new SirecTranscoError(categetab, 'finessCategetab');
  }),
}));

const makeFinessData = (overrides: Partial<SirecFinessData> = {}): SirecFinessData => ({
  id_data: 10,
  nofinesset: '750000001',
  categetab: 355,
  libcategetab: 'CH',
  rs: 'Hôpital Saint-Louis',
  codepostal: '75010',
  libcommune: 'Paris',
  numvoie: 1,
  typevoie: 'RUE',
  voie: 'de la Paix',
  ...overrides,
});

describe('sirecMigration.finess.transformer.ts', () => {
  describe('Case A — MEC précision (kind:mec)', () => {
    it('should return misEnCauseData with the MEC precision id', () => {
      const { misEnCauseData } = transformSirecFiness(makeFinessData({ categetab: 354 }));

      expect(misEnCauseData.kind).toBe('finess');
      expect(misEnCauseData.misEnCauseTypePrecisionId).toBe('SAD_SOINS');
    });

    it('should return misEnCauseTypeId ETABLISSEMENT', () => {
      const { misEnCauseData } = transformSirecFiness(makeFinessData({ categetab: 354 }));
      expect(misEnCauseData.misEnCauseTypeId).toBe('ETABLISSEMENT');
    });

    it('should map finess from nofinesset', () => {
      const { misEnCauseData } = transformSirecFiness(makeFinessData({ categetab: 354, nofinesset: '750000001' }));
      expect(misEnCauseData.finess).toBe('750000001');
    });

    it('should map nomService from rs', () => {
      const { misEnCauseData } = transformSirecFiness(makeFinessData({ categetab: 354, rs: 'Hôpital A' }));
      expect(misEnCauseData.nomService).toBe('Hôpital A');
    });

    it('should return null lieuDeSurvenueData', () => {
      const { lieuDeSurvenueData } = transformSirecFiness(makeFinessData({ categetab: 354 }));
      expect(lieuDeSurvenueData).toBeNull();
    });
  });

  describe('Case B — Lieu survenue (kind:lieu)', () => {
    it('should return misEnCauseData with ETABLISSEMENT precision', () => {
      const { misEnCauseData } = transformSirecFiness(makeFinessData({ categetab: 355 }));
      expect(misEnCauseData.misEnCauseTypePrecisionId).toBe('ETABLISSEMENT');
    });

    it('should return lieuDeSurvenueData with finess and lieuTypeId', () => {
      const { lieuDeSurvenueData } = transformSirecFiness(makeFinessData({ categetab: 355, nofinesset: '750000001' }));

      expect(lieuDeSurvenueData).not.toBeNull();
      expect(lieuDeSurvenueData?.finess).toBe('750000001');
      expect(lieuDeSurvenueData?.lieuTypeId).toBe('ETABLISSEMENT_SANTE');
    });

    it('should map categCode and categLib from FINESS data', () => {
      const { lieuDeSurvenueData } = transformSirecFiness(
        makeFinessData({ categetab: 355, libcategetab: 'Centre Hospitalier' }),
      );

      expect(lieuDeSurvenueData?.categCode).toBe('355');
      expect(lieuDeSurvenueData?.categLib).toBe('Centre Hospitalier');
    });

    it('should build rue from typevoie + voie', () => {
      const { lieuDeSurvenueData } = transformSirecFiness(
        makeFinessData({ categetab: 355, typevoie: 'RUE', voie: 'de la Paix' }),
      );
      expect(lieuDeSurvenueData?.adresse.rue).toBe('RUE de la Paix');
    });

    it('should handle null typevoie in rue construction', () => {
      const { lieuDeSurvenueData } = transformSirecFiness(
        makeFinessData({ categetab: 355, typevoie: null, voie: 'de la Paix' }),
      );
      expect(lieuDeSurvenueData?.adresse.rue).toBe('de la Paix');
    });

    it('should map adresse label from rs', () => {
      const { lieuDeSurvenueData } = transformSirecFiness(makeFinessData({ categetab: 355, rs: 'Hôpital B' }));
      expect(lieuDeSurvenueData?.adresse.label).toBe('Hôpital B');
    });
  });

  describe('error cases', () => {
    it('should throw SirecDataError when nofinesset is null', () => {
      expect(() => transformSirecFiness(makeFinessData({ nofinesset: null }))).toThrow(SirecDataError);
    });

    it('should propagate SirecTranscoError for unknown categetab', () => {
      expect(() => transformSirecFiness(makeFinessData({ categetab: 9999 }))).toThrow(SirecTranscoError);
    });

    it('should propagate SirecDataError for null categetab', () => {
      expect(() => transformSirecFiness(makeFinessData({ categetab: null }))).toThrow(SirecDataError);
    });
  });
});
