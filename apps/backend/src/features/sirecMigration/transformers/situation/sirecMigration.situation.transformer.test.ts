import { describe, expect, it } from 'vitest';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transformSirecSituation } from './sirecMigration.situation.transformer.js';

describe('sirecMigration.situation.transformer.ts', () => {
  const sirecData = {
    reclamation: {
      id_data: 42,
      r_recept_date: new Date('2024-01-15'),
      description: 'Ma réclamation',
      dest: null,
      saisine: null as number | null,
      courrier_signal: null as number | null,
      accuser_reception: null as number | null,
      date_envoi_ar: null as Date | null,
      accuser_reception_precision: null as string | null,
      domaine: null as number | null,
      ei_avere: null as number | null,
      num_sign_assoc: null as string | null,
    },
    motifsDeclaresIdDicos: [809],
    groupIds: [],
    provenances: [],
    institutionPartenaires: {},
    typeTraitementIdDicos: [],
    mainCourantes: [],
    misEnCauses: [],
  } as unknown as SirecReclamationData;

  it('should map description to fait.autresPrecisions', () => {
    const result = transformSirecSituation(sirecData, []);

    expect(result.fait.autresPrecisions).toBe('Description de la Pré-identification : Ma réclamation');
  });

  it('should transcode motifsDeclaresIdDicos into fait.motifsDeclaratifs', () => {
    const result = transformSirecSituation({ ...sirecData, motifsDeclaresIdDicos: [809, 811] }, []);

    expect(result.fait.motifsDeclaratifs).toEqual(['PROBLEME_FACTURATION', 'PROBLEME_LOCAUX']);
  });

  it('should produce an empty motifsDeclaratifs when no motifs are provided', () => {
    const result = transformSirecSituation({ ...sirecData, motifsDeclaresIdDicos: [] }, []);

    expect(result.fait.motifsDeclaratifs).toEqual([]);
  });

  it('should pass entiteIds through to the result', () => {
    const result = transformSirecSituation(sirecData, ['service-1', 'ars-normandie']);

    expect(result.entiteIds).toEqual(['service-1', 'ars-normandie']);
  });

  it('should have an empty entiteIds when none are provided', () => {
    const result = transformSirecSituation(sirecData, []);

    expect(result.entiteIds).toEqual([]);
  });

  it('should add PLAINTE to demarchesIds when saisine is 75', () => {
    const result = transformSirecSituation(
      { ...sirecData, reclamation: { ...sirecData.reclamation, saisine: 75 } },
      [],
    );

    expect(result.demarchesIds).toEqual(['PLAINTE']);
  });

  it('should produce empty demarchesIds when saisine is null', () => {
    const result = transformSirecSituation(sirecData, []);

    expect(result.demarchesIds).toEqual([]);
  });

  it('should produce empty demarchesIds when saisine is a different value', () => {
    const result = transformSirecSituation(
      { ...sirecData, reclamation: { ...sirecData.reclamation, saisine: 12 } },
      [],
    );

    expect(result.demarchesIds).toEqual([]);
  });

  it('should always return lieuDeSurvenueData as null', () => {
    const result = transformSirecSituation(sirecData, []);

    expect(result.lieuDeSurvenueData).toBeNull();
  });

  describe('estLieAuSignalement and numerosSignalement', () => {
    it('should set estLieAuSignalement to true when ei_avere is true (1)', () => {
      const result = transformSirecSituation(
        { ...sirecData, reclamation: { ...sirecData.reclamation, ei_avere: 1 } },
        [],
      );

      expect(result.estLieAuSignalement).toBe(true);
    });

    it('should set estLieAuSignalement to undefined when ei_avere is false and num_sign_assoc is null', () => {
      const result = transformSirecSituation(
        { ...sirecData, reclamation: { ...sirecData.reclamation, ei_avere: 0, num_sign_assoc: null } },
        [],
      );

      expect(result.estLieAuSignalement).toBeUndefined();
    });

    it('should set estLieAuSignalement to undefined when both fields are null', () => {
      const result = transformSirecSituation(sirecData, []);

      expect(result.estLieAuSignalement).toBeUndefined();
    });

    it('should set estLieAuSignalement to true when num_sign_assoc is non-empty', () => {
      const result = transformSirecSituation(
        { ...sirecData, reclamation: { ...sirecData.reclamation, ei_avere: null, num_sign_assoc: 'SIG001' } },
        [],
      );

      expect(result.estLieAuSignalement).toBe(true);
    });

    it('should set estLieAuSignalement to true when both ei_avere is true and num_sign_assoc is set', () => {
      const result = transformSirecSituation(
        { ...sirecData, reclamation: { ...sirecData.reclamation, ei_avere: 1, num_sign_assoc: 'SIG001' } },
        [],
      );

      expect(result.estLieAuSignalement).toBe(true);
    });

    it('should throw SirecTranscoError when ei_avere has an unknown id', () => {
      expect(() =>
        transformSirecSituation({ ...sirecData, reclamation: { ...sirecData.reclamation, ei_avere: 999 } }, []),
      ).toThrow();
    });

    it('should set numerosSignalement to num_sign_assoc content when non-empty', () => {
      const result = transformSirecSituation(
        { ...sirecData, reclamation: { ...sirecData.reclamation, num_sign_assoc: 'SIG001,SIG002' } },
        [],
      );

      expect(result.numerosSignalement).toBe('SIG001,SIG002');
    });

    it('should set numerosSignalement to empty string when num_sign_assoc is null', () => {
      const result = transformSirecSituation(sirecData, []);

      expect(result.numerosSignalement).toBe('');
    });
  });
});
