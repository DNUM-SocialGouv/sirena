/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { describe, expect, it } from 'vitest';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecAccuseReception } from './sirecMigration.accuseReception.transformer.js';

const makeData = (overrides: {
  accuser_reception: number | null;
  date_envoi_ar?: Date | null;
  accuser_reception_precision?: string | null;
}) => ({
  reclamation: {
    id_data: 42,
    accuser_reception: overrides.accuser_reception,
    date_envoi_ar: overrides.date_envoi_ar ?? null,
    accuser_reception_precision: overrides.accuser_reception_precision ?? null,
  } as any,
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances: [],
  misEnCauses: [],
});

const ARS_IDS = ['ars-normandie', 'ars-grand-est'];

describe('sirecMigration.accuseReception.transformer.ts', () => {
  describe('null case', () => {
    it('should return an empty array when accuser_reception is null', () => {
      const result = transformSirecAccuseReception(makeData({ accuser_reception: null }), ARS_IDS);

      expect(result).toEqual([]);
    });
  });

  describe('unknown value', () => {
    it('should throw SirecTranscoError for an unknown accuser_reception value', () => {
      expect(() => transformSirecAccuseReception(makeData({ accuser_reception: 9999 }), ARS_IDS)).toThrow(
        SirecTranscoError,
      );
    });
  });

  describe('false (111/0)', () => {
    it('should create one etape per arsEntiteId with statut FAIT', () => {
      const result = transformSirecAccuseReception(makeData({ accuser_reception: 111 }), ARS_IDS);

      expect(result).toHaveLength(2);
      expect(result[0].statutId).toBe('FAIT');
      expect(result[1].statutId).toBe('FAIT');
    });

    it('should set note to "Envoi d\'un accusé de réception : non"', () => {
      const result = transformSirecAccuseReception(makeData({ accuser_reception: 0 }), ['ars-1']);

      expect(result[0].note).toBe("Envoi d'un accusé de réception : non");
    });

    it('should set entiteId for each ARS entiteId', () => {
      const result = transformSirecAccuseReception(makeData({ accuser_reception: 111 }), ARS_IDS);

      expect(result[0].entiteId).toBe('ars-normandie');
      expect(result[1].entiteId).toBe('ars-grand-est');
    });

    it('should not set createdAt', () => {
      const result = transformSirecAccuseReception(makeData({ accuser_reception: 111 }), ['ars-1']);

      expect(result[0].createdAt).toBeUndefined();
    });
  });

  describe('true (1/112) with date_envoi_ar', () => {
    it('should set statut to FAIT', () => {
      const result = transformSirecAccuseReception(
        makeData({ accuser_reception: 1, date_envoi_ar: new Date('2024-03-05') }),
        ['ars-1'],
      );

      expect(result[0].statutId).toBe('FAIT');
    });

    it('should set createdAt to date_envoi_ar', () => {
      const date = new Date('2024-03-05');
      const result = transformSirecAccuseReception(makeData({ accuser_reception: 1, date_envoi_ar: date }), ['ars-1']);

      expect(result[0].createdAt).toEqual(date);
    });

    it('should include formatted date in note', () => {
      const result = transformSirecAccuseReception(
        makeData({ accuser_reception: 1, date_envoi_ar: new Date('2024-03-05') }),
        ['ars-1'],
      );

      expect(result[0].note).toContain("Date d'envoi de l'accusé de réception au requérant : 05/03/2024");
    });

    it('should append precision to note when set', () => {
      const result = transformSirecAccuseReception(
        makeData({
          accuser_reception: 1,
          date_envoi_ar: new Date('2024-03-05'),
          accuser_reception_precision: 'Par email',
        }),
        ['ars-1'],
      );

      expect(result[0].note).toContain("Date d'envoi de l'accusé de réception au requérant : 05/03/2024");
      expect(result[0].note).toContain('Précisions : Par email');
      expect(result[0].note).toContain('\n');
    });

    it('should not include precision in note when null', () => {
      const result = transformSirecAccuseReception(
        makeData({ accuser_reception: 1, date_envoi_ar: new Date('2024-03-05'), accuser_reception_precision: null }),
        ['ars-1'],
      );

      expect(result[0].note).not.toContain('Précisions');
    });
  });

  describe('true (1/112) without date_envoi_ar', () => {
    it('should set statut to A_FAIRE', () => {
      const result = transformSirecAccuseReception(makeData({ accuser_reception: 1, date_envoi_ar: null }), ['ars-1']);

      expect(result[0].statutId).toBe('A_FAIRE');
    });

    it('should not set createdAt', () => {
      const result = transformSirecAccuseReception(makeData({ accuser_reception: 1, date_envoi_ar: null }), ['ars-1']);

      expect(result[0].createdAt).toBeUndefined();
    });

    it('should set note to null when no date and no precision', () => {
      const result = transformSirecAccuseReception(
        makeData({ accuser_reception: 1, date_envoi_ar: null, accuser_reception_precision: null }),
        ['ars-1'],
      );

      expect(result[0].note).toBeNull();
    });

    it('should include precision in note when set even without date', () => {
      const result = transformSirecAccuseReception(
        makeData({ accuser_reception: 1, date_envoi_ar: null, accuser_reception_precision: 'Par courrier' }),
        ['ars-1'],
      );

      expect(result[0].note).toBe('Précisions : Par courrier');
    });
  });

  describe('empty arsEntiteIds', () => {
    it('should return an empty array when arsEntiteIds is empty even if accuser_reception is set', () => {
      const result = transformSirecAccuseReception(makeData({ accuser_reception: 1 }), []);

      expect(result).toEqual([]);
    });
  });
});
