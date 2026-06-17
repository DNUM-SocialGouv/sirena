import { describe, expect, it } from 'vitest';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecCloture } from './sirecMigration.cloture.transformer.js';

const makeData = (
  overrides: { type_cloture?: number | null; motif_cloture?: string | null; date_cloture?: Date | null } = {},
) =>
  ({
    reclamation: {
      id_data: 42,
      type_cloture: null,
      motif_cloture: null,
      date_cloture: null,
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

describe('sirecMigration.cloture.transformer.ts', () => {
  describe('when type_cloture is null', () => {
    it('should return EN_COURS statut and no etapes', () => {
      const result = transformSirecCloture(makeData(), [ARS_1]);

      expect(result.requeteStatutId).toBe('EN_COURS');
      expect(result.etapes).toEqual([]);
    });
  });

  describe('when type_cloture is set', () => {
    it('should return CLOTUREE statut', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115 }), [ARS_1]);

      expect(result.requeteStatutId).toBe('CLOTUREE');
    });

    it('should throw SirecTranscoError for unknown type_cloture', () => {
      expect(() => transformSirecCloture(makeData({ type_cloture: 99999 }), [ARS_1])).toThrow(SirecTranscoError);
    });

    it('should create one etape per arsEntiteId', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115 }), [ARS_1, ARS_2]);

      expect(result.etapes).toHaveLength(2);
      expect(result.etapes[0].entiteId).toBe(ARS_1);
      expect(result.etapes[1].entiteId).toBe(ARS_2);
    });

    it('should set nom to "Clôture"', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115 }), [ARS_1]);

      expect(result.etapes[0].nom).toBe('Clôture');
    });

    it('should set statutId to FAIT', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115 }), [ARS_1]);

      expect(result.etapes[0].statutId).toBe('FAIT');
    });

    it('should set clotureReason from type_cloture transco (115 → SANS_SUITE)', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115 }), [ARS_1]);

      expect(result.etapes[0].clotureReason).toBe('SANS_SUITE');
    });

    it('should set clotureReason from type_cloture transco (794 → AUTRE)', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 794 }), [ARS_1]);

      expect(result.etapes[0].clotureReason).toBe('AUTRE');
    });

    it('should set note from motif_cloture', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115, motif_cloture: 'Dossier incomplet' }), [
        ARS_1,
      ]);

      expect(result.etapes[0].note).toBe('Dossier incomplet');
    });

    it('should set note to null when motif_cloture is null', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115 }), [ARS_1]);

      expect(result.etapes[0].note).toBeNull();
    });

    it('should set createdAt from date_cloture when provided', () => {
      const date = new Date('2024-08-20');
      const result = transformSirecCloture(makeData({ type_cloture: 115, date_cloture: date }), [ARS_1]);

      expect(result.etapes[0].createdAt).toEqual(date);
    });

    it('should not set createdAt when date_cloture is null', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115 }), [ARS_1]);

      expect(result.etapes[0].createdAt).toBeUndefined();
    });

    it('should return empty etapes when arsEntiteIds is empty', () => {
      const result = transformSirecCloture(makeData({ type_cloture: 115 }), []);

      expect(result.etapes).toEqual([]);
      expect(result.requeteStatutId).toBe('CLOTUREE');
    });
  });
});
