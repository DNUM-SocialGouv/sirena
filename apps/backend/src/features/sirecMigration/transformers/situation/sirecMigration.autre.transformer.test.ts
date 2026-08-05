import { describe, expect, it } from 'vitest';
import type { SirecMisEnCause } from '../../sirecMigration.repository.js';
import { transformSirecAutre } from './sirecMigration.autre.transformer.js';

const makeMisEnCause = (overrides: Partial<SirecMisEnCause> = {}): SirecMisEnCause => ({
  id_data: 10,
  type: 67,
  identifiant: null,
  autresMcType: 120,
  label: 'Dr Test',
  adresse: null,
  serviceConcerne: null,
  publicConcerne: null,
  groupIds: [],
  rppsData: null,
  finessData: null,
  motifsIgas: [],
  ...overrides,
});

describe('sirecMigration.autre.transformer.ts', () => {
  describe('autresMcType sans lieu de survenue (ex: 120)', () => {
    it('should return misEnCauseData with kind autre', () => {
      const { misEnCauseData } = transformSirecAutre(makeMisEnCause({ autresMcType: 120 }));
      expect(misEnCauseData.kind).toBe('autre');
      expect(misEnCauseData.misEnCauseTypeId).toBe('AUTRE_PROFESSIONNEL');
      expect(misEnCauseData.misEnCauseTypePrecisionId).toBe('ACUPUNCTEUR');
    });

    it('should return null lieuDeSurvenueData', () => {
      const { lieuDeSurvenueData } = transformSirecAutre(makeMisEnCause({ autresMcType: 120 }));
      expect(lieuDeSurvenueData).toBeNull();
    });
  });

  describe('autresMcType 122 — Etablissement fictif', () => {
    it('should return misEnCauseData ETABLISSEMENT / ETABLISSEMENT', () => {
      const { misEnCauseData } = transformSirecAutre(makeMisEnCause({ autresMcType: 122 }));
      expect(misEnCauseData.misEnCauseTypeId).toBe('ETABLISSEMENT');
      expect(misEnCauseData.misEnCauseTypePrecisionId).toBe('ETABLISSEMENT');
    });

    it('should return lieuDeSurvenueData with lieuTypeId ETABLISSEMENT_FICTIF and no lieuPrecision', () => {
      const { lieuDeSurvenueData } = transformSirecAutre(makeMisEnCause({ autresMcType: 122 }));
      expect(lieuDeSurvenueData).toEqual({ lieuTypeId: 'ETABLISSEMENT_FICTIF' });
    });
  });

  describe('autresMcType 124 — Maison d’arrêt', () => {
    it('should return lieuDeSurvenueData with lieuTypeId AUTRES_ETABLISSEMENTS and lieuPrecision MAISON_ARRET', () => {
      const { lieuDeSurvenueData } = transformSirecAutre(makeMisEnCause({ autresMcType: 124 }));
      expect(lieuDeSurvenueData).toEqual({ lieuTypeId: 'AUTRES_ETABLISSEMENTS', lieuPrecision: 'MAISON_ARRET' });
    });
  });

  describe('autresMcType 130 — Transporteur sanitaire', () => {
    it('should return lieuDeSurvenueData with lieuTypeId TRAJET and lieuPrecision TRANSPORTEUR_SANITAIRE', () => {
      const { lieuDeSurvenueData } = transformSirecAutre(makeMisEnCause({ autresMcType: 130 }));
      expect(lieuDeSurvenueData).toEqual({ lieuTypeId: 'TRAJET', lieuPrecision: 'TRANSPORTEUR_SANITAIRE' });
    });
  });

  it('should still build autrePrecision from label/adresse for a requalified type', () => {
    const { misEnCauseData } = transformSirecAutre(
      makeMisEnCause({ autresMcType: 124, label: 'Centre pénitentiaire', adresse: '1 rue de la Prison' }),
    );
    expect(misEnCauseData.autrePrecision).toContain("Type de mis en cause : Maison d'arrêt");
    expect(misEnCauseData.autrePrecision).toContain('Nom / structure : Centre pénitentiaire');
    expect(misEnCauseData.autrePrecision).toContain('Adresse : 1 rue de la Prison');
  });
});
