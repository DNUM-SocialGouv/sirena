import { describe, expect, it } from 'vitest';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecMesuresPrises } from './sirecMigration.mesuresPrises.transformer.js';

const makeData = (
  overrides: {
    mesures_prises?: number | null;
    mesures_initiative?: number | null;
    mesures_precision?: string | null;
    sys_creation_date?: Date | null;
  } = {},
) =>
  ({
    reclamation: {
      id_data: 42,
      mesures_prises: null,
      mesures_initiative: null,
      mesures_precision: null,
      sys_creation_date: null,
      ...overrides,
    },
    motifsDeclaresIdDicos: [],
    groupIds: [],
    provenances: [],
    institutionPartenaires: {},
    typeTraitementIdDicos: [],
    mainCourantes: [],
    misEnCauses: [],
  }) as unknown as SirecReclamationData;

const ARS_1 = 'ars-normandie';
const ARS_2 = 'ars-grand-est';

describe('sirecMigration.mesuresPrises.transformer.ts', () => {
  describe('trigger condition', () => {
    it('should create etapes when mesures_prises is null', () => {
      expect(transformSirecMesuresPrises(makeData({ mesures_prises: null }), [ARS_1])).toHaveLength(1);
    });

    it('should return empty when mesures_prises maps to false (id 111)', () => {
      expect(transformSirecMesuresPrises(makeData({ mesures_prises: 111 }), [ARS_1])).toEqual([]);
    });

    it('should return empty when mesures_prises maps to false (id 0)', () => {
      expect(transformSirecMesuresPrises(makeData({ mesures_prises: 0 }), [ARS_1])).toEqual([]);
    });

    it('should throw SirecTranscoError for unknown mesures_prises id', () => {
      expect(() => transformSirecMesuresPrises(makeData({ mesures_prises: 99999 }), [ARS_1])).toThrow(
        SirecTranscoError,
      );
    });

    it('should create etapes when mesures_prises maps to true (id 1)', () => {
      expect(transformSirecMesuresPrises(makeData({ mesures_prises: 1 }), [ARS_1])).toHaveLength(1);
    });

    it('should create etapes when mesures_prises maps to true (id 112)', () => {
      expect(transformSirecMesuresPrises(makeData({ mesures_prises: 112 }), [ARS_1])).toHaveLength(1);
    });
  });

  describe('etape structure', () => {
    it('should set nom to "Mesures prises par le mis en cause"', () => {
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1 }), [ARS_1]);

      expect(result[0].nom).toBe('Mesures prises par le mis en cause');
    });

    it('should set statutId to FAIT', () => {
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1 }), [ARS_1]);

      expect(result[0].statutId).toBe('FAIT');
    });

    it('should set createdAt when sys_creation_date is provided', () => {
      const date = new Date('2024-05-10');
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1, sys_creation_date: date }), [ARS_1]);

      expect(result[0].createdAt).toEqual(date);
    });

    it('should set createdAt to null when sys_creation_date is null', () => {
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1, sys_creation_date: null }), [ARS_1]);

      expect(result[0].createdAt).toBeNull();
    });

    it('should create one etape per arsEntiteId', () => {
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1 }), [ARS_1, ARS_2]);

      expect(result).toHaveLength(2);
      expect(result[0].entiteId).toBe(ARS_1);
      expect(result[1].entiteId).toBe(ARS_2);
    });
  });

  describe('note — mesures_initiative line', () => {
    it('should include initiative label when mesures_initiative is set', () => {
      // SIREC_DICO[404] = 'Assurance Maladie'
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1, mesures_initiative: 404 }), [ARS_1]);

      expect(result[0].note).toContain("Mesure à l'initiative de : Assurance Maladie");
    });

    it('should omit initiative line when mesures_initiative is null', () => {
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1, mesures_precision: 'une précision' }), [
        ARS_1,
      ]);

      expect(result[0].note).not.toContain("Mesure à l'initiative de");
    });

    it('should throw SirecTranscoError for unknown mesures_initiative id', () => {
      expect(() =>
        transformSirecMesuresPrises(makeData({ mesures_prises: 1, mesures_initiative: 99999 }), [ARS_1]),
      ).toThrow(SirecTranscoError);
    });
  });

  describe('note — mesures_precision line', () => {
    it('should include précisions when mesures_precision is set', () => {
      const result = transformSirecMesuresPrises(
        makeData({ mesures_prises: 1, mesures_precision: 'Détail supplémentaire' }),
        [ARS_1],
      );

      expect(result[0].note).toContain('Précisions : Détail supplémentaire');
    });

    it('should omit précisions when mesures_precision is null', () => {
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1, mesures_initiative: 404 }), [ARS_1]);

      expect(result[0].note).not.toContain('Précisions');
    });
  });

  describe('note — combined and empty cases', () => {
    it('should set note to null when both mesures_initiative and mesures_precision are null', () => {
      const result = transformSirecMesuresPrises(makeData({ mesures_prises: 1 }), [ARS_1]);

      expect(result[0].note).toBeNull();
    });

    it('should join initiative and précisions lines with newline', () => {
      // SIREC_DICO[404] = 'Assurance Maladie'
      const result = transformSirecMesuresPrises(
        makeData({ mesures_prises: 1, mesures_initiative: 404, mesures_precision: 'Info complémentaire' }),
        [ARS_1],
      );

      expect(result[0].note).toBe("Mesure à l'initiative de : Assurance Maladie\nPrécisions : Info complémentaire");
    });
  });
});
