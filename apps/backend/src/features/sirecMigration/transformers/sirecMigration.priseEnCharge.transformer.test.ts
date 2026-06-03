import { describe, expect, it } from 'vitest';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecPriseEnCharge } from './sirecMigration.priseEnCharge.transformer.js';

const makeData = (
  overrides: {
    date_traitement?: Date | null;
    type_traitement_prec?: string | null;
  } = {},
  typeTraitementIdDicos: number[] = [],
) => ({
  reclamation: {
    id_data: 42,
    date_traitement: null,
    type_traitement_prec: null,
    ...overrides,
  },
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances: [],
  institutionPartenaires: {},
  typeTraitementIdDicos,
  misEnCauses: [],
});

const ARS_1 = 'ars-normandie';
const ARS_2 = 'ars-grand-est';

describe('sirecMigration.priseEnCharge.transformer.ts', () => {
  describe('trigger condition', () => {
    it('should return empty when all three fields are absent', () => {
      const result = transformSirecPriseEnCharge(makeData(), [ARS_1]);

      expect(result).toEqual([]);
    });

    it('should create etapes when date_traitement is set', () => {
      const result = transformSirecPriseEnCharge(makeData({ date_traitement: new Date() }), [ARS_1]);

      expect(result).toHaveLength(1);
    });

    it('should create etapes when typeTraitementIdDicos is non-empty', () => {
      const result = transformSirecPriseEnCharge(makeData({}, [344]), [ARS_1]);

      expect(result).toHaveLength(1);
    });

    it('should create etapes when type_traitement_prec is set', () => {
      const result = transformSirecPriseEnCharge(makeData({ type_traitement_prec: 'une précision' }), [ARS_1]);

      expect(result).toHaveLength(1);
    });
  });

  describe('etape structure', () => {
    it('should set nom to "Prise en charge de la requête"', () => {
      const result = transformSirecPriseEnCharge(makeData({ date_traitement: new Date() }), [ARS_1]);

      expect(result[0].nom).toBe('Prise en charge de la requête');
    });

    it('should always set statutId to FAIT', () => {
      const result = transformSirecPriseEnCharge(makeData({ type_traitement_prec: 'prec' }), [ARS_1]);

      expect(result[0].statutId).toBe('FAIT');
    });

    it('should set createdAt when date_traitement is provided', () => {
      const date = new Date('2024-05-10');
      const result = transformSirecPriseEnCharge(makeData({ date_traitement: date }), [ARS_1]);

      expect(result[0].createdAt).toEqual(date);
    });

    it('should not set createdAt when date_traitement is null', () => {
      const result = transformSirecPriseEnCharge(makeData({ type_traitement_prec: 'prec' }), [ARS_1]);

      expect(result[0].createdAt).toBeUndefined();
    });

    it('should create one etape per arsEntiteId', () => {
      const result = transformSirecPriseEnCharge(makeData({ date_traitement: new Date() }), [ARS_1, ARS_2]);

      expect(result).toHaveLength(2);
      expect(result[0].entiteId).toBe(ARS_1);
      expect(result[1].entiteId).toBe(ARS_2);
    });
  });

  describe('note — date line', () => {
    it('should write formatted date when date_traitement is set', () => {
      const date = new Date('2024-03-15');
      const result = transformSirecPriseEnCharge(makeData({ date_traitement: date }), [ARS_1]);

      expect(result[0].note).toContain('Date de prise en charge : 15/03/2024');
    });

    it('should write "non renseignée" when date_traitement is null', () => {
      const result = transformSirecPriseEnCharge(makeData({ type_traitement_prec: 'prec' }), [ARS_1]);

      expect(result[0].note).toContain('Date de prise en charge : non renseignée');
    });
  });

  describe('note — types de traitement line', () => {
    it('should include transcoded label when a valid id_dico is provided', () => {
      // SIREC_DICO[344] = "Communication d'un délai d'attente au requérant"
      const result = transformSirecPriseEnCharge(makeData({}, [344]), [ARS_1]);

      expect(result[0].note).toContain("Type(s) de traitement : Communication d'un délai d'attente au requérant");
    });

    it('should join multiple labels with ", "', () => {
      // SIREC_DICO[344], SIREC_DICO[346]
      const result = transformSirecPriseEnCharge(makeData({}, [344, 346]), [ARS_1]);

      expect(result[0].note).toContain(
        "Type(s) de traitement : Communication d'un délai d'attente au requérant, Relance de l'ARS par le requérant",
      );
    });

    it('should omit the types line when typeTraitementIdDicos is empty', () => {
      const result = transformSirecPriseEnCharge(makeData({ date_traitement: new Date() }), [ARS_1]);

      expect(result[0].note).not.toContain('Type(s) de traitement');
    });

    it('should throw SirecTranscoError for unknown id_dico', () => {
      expect(() => transformSirecPriseEnCharge(makeData({}, [99999]), [ARS_1])).toThrow(SirecTranscoError);
    });
  });

  describe('note — précisions line', () => {
    it('should include précisions when type_traitement_prec is set', () => {
      const result = transformSirecPriseEnCharge(makeData({ type_traitement_prec: 'Instruction complexe' }), [ARS_1]);

      expect(result[0].note).toContain('Précisions : Instruction complexe');
    });

    it('should omit précisions when type_traitement_prec is null', () => {
      const result = transformSirecPriseEnCharge(makeData({ date_traitement: new Date() }), [ARS_1]);

      expect(result[0].note).not.toContain('Précisions');
    });
  });

  describe('note — line joining', () => {
    it('should join all three lines with newline', () => {
      const date = new Date('2024-01-20');
      const result = transformSirecPriseEnCharge(
        makeData({ date_traitement: date, type_traitement_prec: 'Info' }, [344]),
        [ARS_1],
      );

      expect(result[0].note).toBe(
        "Date de prise en charge : 20/01/2024\nType(s) de traitement : Communication d'un délai d'attente au requérant\nPrécisions : Info",
      );
    });

    it('should include only date and précisions lines when no types', () => {
      const date = new Date('2024-01-20');
      const result = transformSirecPriseEnCharge(makeData({ date_traitement: date, type_traitement_prec: 'Info' }), [
        ARS_1,
      ]);

      expect(result[0].note).toBe('Date de prise en charge : 20/01/2024\nPrécisions : Info');
    });
  });
});
