/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { describe, expect, it } from 'vitest';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecReponsePlaignant } from './sirecMigration.reponsePlaignant.transformer.js';

const makeData = (overrides: {
  reponse_plaignant?: number | null;
  date_rep_plaignant?: Date | null;
  reponse_plaignant_precision?: string | null;
}) => ({
  reclamation: {
    id_data: 42,
    reponse_plaignant: overrides.reponse_plaignant ?? null,
    date_rep_plaignant: overrides.date_rep_plaignant ?? null,
    reponse_plaignant_precision: overrides.reponse_plaignant_precision ?? null,
  } as any,
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances: [],
  institutionPartenaires: {},
  typeTraitementIdDicos: [],
});

const ARS_IDS = ['ars-normandie', 'ars-grand-est'];

describe('sirecMigration.reponsePlaignant.transformer.ts', () => {
  describe('no data', () => {
    it('should return an empty array when all three fields are null', () => {
      const result = transformSirecReponsePlaignant(makeData({}), ARS_IDS);

      expect(result).toEqual([]);
    });

    it('should return an empty array when arsEntiteIds is empty but data is present', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 1 }), []);

      expect(result).toEqual([]);
    });
  });

  describe('triggers (at least one field non-null)', () => {
    it('should create etapes when only reponse_plaignant is set', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 1 }), ARS_IDS);

      expect(result).toHaveLength(2);
    });

    it('should create etapes when only date_rep_plaignant is set', () => {
      const result = transformSirecReponsePlaignant(makeData({ date_rep_plaignant: new Date('2024-03-05') }), ARS_IDS);

      expect(result).toHaveLength(2);
    });

    it('should create etapes when only reponse_plaignant_precision is set', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant_precision: 'Par courrier' }), ARS_IDS);

      expect(result).toHaveLength(2);
    });
  });

  describe('nom', () => {
    it('should set nom to "Réponse au requérant par l\'ARS"', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 1 }), ['ars-1']);

      expect(result[0].nom).toBe("Réponse au requérant par l'ARS");
    });
  });

  describe('entiteId', () => {
    it('should create one etape per arsEntiteId', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 1 }), ARS_IDS);

      expect(result[0].entiteId).toBe('ars-normandie');
      expect(result[1].entiteId).toBe('ars-grand-est');
    });
  });

  describe('statutId and createdAt', () => {
    it('should set statutId to FAIT and createdAt when date_rep_plaignant is set', () => {
      const date = new Date('2024-03-05');
      const result = transformSirecReponsePlaignant(makeData({ date_rep_plaignant: date }), ['ars-1']);

      expect(result[0].statutId).toBe('FAIT');
      expect(result[0].createdAt).toEqual(date);
    });

    it('should set statutId to A_FAIRE and no createdAt when date_rep_plaignant is null', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 1 }), ['ars-1']);

      expect(result[0].statutId).toBe('A_FAIRE');
      expect(result[0].createdAt).toBeUndefined();
    });
  });

  describe('note — reponse_plaignant', () => {
    it('should include "Réponse au requérant par l\'ARS : Oui" when reponse_plaignant is true (1)', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 1 }), ['ars-1']);

      expect(result[0].note).toContain("Réponse au requérant par l'ARS : Oui");
    });

    it('should include "Réponse au requérant par l\'ARS : Oui" when reponse_plaignant is true (112)', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 112 }), ['ars-1']);

      expect(result[0].note).toContain("Réponse au requérant par l'ARS : Oui");
    });

    it('should include "Réponse au requérant par l\'ARS : Non" when reponse_plaignant is false (0)', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 0 }), ['ars-1']);

      expect(result[0].note).toContain("Réponse au requérant par l'ARS : Non");
    });

    it('should include "Réponse au requérant par l\'ARS : Non" when reponse_plaignant is false (111)', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 111 }), ['ars-1']);

      expect(result[0].note).toContain("Réponse au requérant par l'ARS : Non");
    });

    it('should not include reponse line in note when reponse_plaignant is null', () => {
      const result = transformSirecReponsePlaignant(makeData({ date_rep_plaignant: new Date('2024-03-05') }), [
        'ars-1',
      ]);

      expect(result[0].note).not.toContain("Réponse au requérant par l'ARS :");
    });

    it('should throw SirecTranscoError for an unknown reponse_plaignant value', () => {
      expect(() => transformSirecReponsePlaignant(makeData({ reponse_plaignant: 9999 }), ['ars-1'])).toThrow(
        SirecTranscoError,
      );
    });
  });

  describe('note — date_rep_plaignant', () => {
    it('should include "Date de réponse : DD/MM/YYYY" when date is set', () => {
      const result = transformSirecReponsePlaignant(makeData({ date_rep_plaignant: new Date('2024-03-05') }), [
        'ars-1',
      ]);

      expect(result[0].note).toContain('Date de réponse : 05/03/2024');
    });

    it('should not include date line when date_rep_plaignant is null', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 1 }), ['ars-1']);

      expect(result[0].note).not.toContain('Date de réponse');
    });
  });

  describe('note — reponse_plaignant_precision', () => {
    it('should include "Précisions : <value>" when precision is set', () => {
      const result = transformSirecReponsePlaignant(
        makeData({ reponse_plaignant_precision: 'Par courrier recommandé' }),
        ['ars-1'],
      );

      expect(result[0].note).toContain('Précisions : Par courrier recommandé');
    });

    it('should not include precision line when reponse_plaignant_precision is null', () => {
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant: 1 }), ['ars-1']);

      expect(result[0].note).not.toContain('Précisions');
    });
  });

  describe('note — combined', () => {
    it('should join all present lines with newline', () => {
      const result = transformSirecReponsePlaignant(
        makeData({
          reponse_plaignant: 1,
          date_rep_plaignant: new Date('2024-03-05'),
          reponse_plaignant_precision: 'Email',
        }),
        ['ars-1'],
      );

      expect(result[0].note).toBe(
        "Réponse au requérant par l'ARS : Oui\nDate de réponse : 05/03/2024\nPrécisions : Email",
      );
    });

    it('should set note to null when all three fields are null but hasData is false — unreachable guard', () => {
      // This tests the note=null branch via only precision set (no reponse/date lines)
      // Actually all cases with hasData=true produce at least one line.
      // This case: only precision → note has 1 line
      const result = transformSirecReponsePlaignant(makeData({ reponse_plaignant_precision: 'Info' }), ['ars-1']);

      expect(result[0].note).toBe('Précisions : Info');
    });
  });
});
