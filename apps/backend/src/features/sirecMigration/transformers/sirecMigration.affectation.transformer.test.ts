import { describe, expect, it, vi } from 'vitest';
import { SirecDataError, SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecAffectation } from './sirecMigration.affectation.transformer.js';

vi.mock('../transco/affectation.transco.js', () => ({
  transcodeAffectation: vi.fn((id: number) => {
    if (id === 693) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: [] };
    if (id === 677) return { requeteEntiteIds: ['ars-grand-est'], situationEntiteIds: [] };
    if (id === 1115) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: ['service-1', 'ars-normandie'] };
    if (id === 1121) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: ['service-2', 'ars-normandie'] };
    throw new SirecTranscoError(id, 'affectation');
  }),
}));

const makeData = (
  service_recepteur_niv1: number | null,
  service_gestionnaire: number | null,
  groupIds: number[] = [],
) => ({
  reclamation: {
    id_data: 42,
    r_recept_date: null,
    description: null,
    reception: null,
    prioritaire: null,
    service_recepteur_niv1,
    service_gestionnaire,
  },
  motifsDeclaresIdDicos: [],
  groupIds,
  provenances: [],
});

describe('sirecMigration.affectation.transformer.ts', () => {
  describe('ARS direct assignment', () => {
    it('should put ARS entiteId in requeteEntiteIds and leave situationEntiteIds empty', () => {
      const result = transformSirecAffectation(makeData(693, null));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
      expect(result.situationEntiteIds).toEqual([]);
    });

    it('should collect entiteIds from both fields', () => {
      const result = transformSirecAffectation(makeData(693, 677));

      expect(result.requeteEntiteIds).toContain('ars-normandie');
      expect(result.requeteEntiteIds).toContain('ars-grand-est');
    });

    it('should deduplicate requeteEntiteIds when both fields resolve to the same ARS', () => {
      const result = transformSirecAffectation(makeData(693, 693));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });
  });

  describe('service assignment', () => {
    it('should put service entiteIds in situationEntiteIds and ARS in requeteEntiteIds', () => {
      const result = transformSirecAffectation(makeData(1115, null));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
      expect(result.situationEntiteIds).toContain('service-1');
      expect(result.situationEntiteIds).toContain('ars-normandie');
    });

    it('should deduplicate situationEntiteIds when both fields resolve to the same ARS service', () => {
      const result = transformSirecAffectation(makeData(1115, 1115));

      expect(result.situationEntiteIds.filter((id) => id === 'ars-normandie')).toHaveLength(1);
      expect(result.situationEntiteIds.filter((id) => id === 'service-1')).toHaveLength(1);
    });

    it('should merge situationEntiteIds from both fields without duplicates', () => {
      const result = transformSirecAffectation(makeData(1115, 1121));

      expect(result.situationEntiteIds).toContain('service-1');
      expect(result.situationEntiteIds).toContain('service-2');
      expect(result.situationEntiteIds.filter((id) => id === 'ars-normandie')).toHaveLength(1);
    });
  });

  describe('null / missing fields', () => {
    it('should ignore a null service_gestionnaire', () => {
      const result = transformSirecAffectation(makeData(693, null));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });

    it('should ignore a null service_recepteur_niv1', () => {
      const result = transformSirecAffectation(makeData(null, 693));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });

    it('should ignore a zero value field', () => {
      const result = transformSirecAffectation(makeData(0, 693));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });

    it('should throw SirecDataError when both fields are null', () => {
      expect(() => transformSirecAffectation(makeData(null, null))).toThrow(SirecDataError);
    });

    it('should throw SirecDataError when both fields are zero', () => {
      expect(() => transformSirecAffectation(makeData(0, 0))).toThrow(SirecDataError);
    });
  });

  describe('groupIds', () => {
    it('should add ARS from groupId to requeteEntiteIds', () => {
      const result = transformSirecAffectation(makeData(null, null, [677]));

      expect(result.requeteEntiteIds).toEqual(['ars-grand-est']);
    });

    it('should add service and ARS from groupId to both requeteEntiteIds and situationEntiteIds', () => {
      const result = transformSirecAffectation(makeData(null, null, [1115]));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
      expect(result.situationEntiteIds).toContain('service-1');
      expect(result.situationEntiteIds).toContain('ars-normandie');
    });

    it('should deduplicate requeteEntiteIds between groupIds and service fields', () => {
      const result = transformSirecAffectation(makeData(693, null, [677]));

      expect(result.requeteEntiteIds).toContain('ars-normandie');
      expect(result.requeteEntiteIds).toContain('ars-grand-est');
      expect(result.requeteEntiteIds).toHaveLength(2);
    });

    it('should deduplicate when groupId resolves to the same ARS as a service field', () => {
      const result = transformSirecAffectation(makeData(693, null, [693]));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });

    it('should satisfy the non-empty check with groupIds alone', () => {
      expect(() => transformSirecAffectation(makeData(null, null, [693]))).not.toThrow();
    });

    it('should still throw SirecDataError when all fields and groupIds are empty', () => {
      expect(() => transformSirecAffectation(makeData(null, null, []))).toThrow(SirecDataError);
    });
  });

  describe('unknown ids', () => {
    it('should propagate SirecTranscoError for an unknown id', () => {
      expect(() => transformSirecAffectation(makeData(9999, null))).toThrow(SirecTranscoError);
    });

    it('should propagate SirecTranscoError for an unknown groupId', () => {
      expect(() => transformSirecAffectation(makeData(null, null, [9999]))).toThrow(SirecTranscoError);
    });
  });
});
