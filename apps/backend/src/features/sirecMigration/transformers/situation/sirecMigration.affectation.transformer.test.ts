import { describe, expect, it, vi } from 'vitest';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SirecDataError, SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecAffectation } from './sirecMigration.affectation.transformer.js';

vi.mock('../../transco/affectation/affectation.transco.js', () => ({
  SIREC_NATIONAL_ENTITE_ID: 1,
  transcodeAffectation: vi.fn((id: number) => {
    if (id === 693) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: [] };
    if (id === 677) return { requeteEntiteIds: ['ars-grand-est'], situationEntiteIds: [] };
    if (id === 1115) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: ['service-1', 'ars-normandie'] };
    if (id === 1121) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: ['service-2', 'ars-normandie'] };
    throw new SirecTranscoError(id, 'affectation');
  }),
}));

const makeData = (
  service_gestionnaire: number | null,
  groupIds: number[] = [],
  mainCourantes: { groupIds: number[] }[] = [],
) =>
  ({
    reclamation: {
      id_data: 42,
      r_recept_date: null,
      description: null,
      reception: null,
      prioritaire: null,
      service_recepteur_niv1: null,
      service_gestionnaire,
      accuser_reception: null,
      date_envoi_ar: null,
      accuser_reception_precision: null,
    },
    motifsDeclaresIdDicos: [],
    groupIds,
    mainCourantes,
    provenances: [],
    institutionPartenaires: {},
    typeTraitementIdDicos: [],
    misEnCauses: [],
  }) as unknown as SirecReclamationData;

describe('sirecMigration.affectation.transformer.ts', () => {
  describe('ARS direct assignment', () => {
    it('should put ARS entiteId in requeteEntiteIds and leave situationEntiteIds empty', () => {
      const result = transformSirecAffectation(makeData(693));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
      expect(result.situationEntiteIds).toEqual([]);
    });

    it('should collect entiteIds from service_gestionnaire and groupIds', () => {
      const result = transformSirecAffectation(makeData(693, [677]));

      expect(result.requeteEntiteIds).toContain('ars-normandie');
      expect(result.requeteEntiteIds).toContain('ars-grand-est');
    });

    it('should deduplicate requeteEntiteIds when service_gestionnaire and a groupId resolve to the same ARS', () => {
      const result = transformSirecAffectation(makeData(693, [693]));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });
  });

  describe('service assignment', () => {
    it('should put service entiteIds in situationEntiteIds and ARS in requeteEntiteIds', () => {
      const result = transformSirecAffectation(makeData(1115));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
      expect(result.situationEntiteIds).toContain('service-1');
      expect(result.situationEntiteIds).toContain('ars-normandie');
    });

    it('should deduplicate situationEntiteIds when service_gestionnaire and a groupId resolve to the same ARS service', () => {
      const result = transformSirecAffectation(makeData(1115, [1115]));

      expect(result.situationEntiteIds.filter((id) => id === 'ars-normandie')).toHaveLength(1);
      expect(result.situationEntiteIds.filter((id) => id === 'service-1')).toHaveLength(1);
    });

    it('should merge situationEntiteIds from service_gestionnaire and groupIds without duplicates', () => {
      const result = transformSirecAffectation(makeData(1115, [1121]));

      expect(result.situationEntiteIds).toContain('service-1');
      expect(result.situationEntiteIds).toContain('service-2');
      expect(result.situationEntiteIds.filter((id) => id === 'ars-normandie')).toHaveLength(1);
    });
  });

  describe('null / missing fields', () => {
    it('should ignore a null service_gestionnaire when a groupId is present', () => {
      const result = transformSirecAffectation(makeData(null, [693]));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });

    it('should ignore a zero value service_gestionnaire when a groupId is present', () => {
      const result = transformSirecAffectation(makeData(0, [693]));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });

    it('should throw SirecDataError when service_gestionnaire is null and there are no groupIds', () => {
      expect(() => transformSirecAffectation(makeData(null))).toThrow(SirecDataError);
    });

    it('should throw SirecDataError when service_gestionnaire is zero and there are no groupIds', () => {
      expect(() => transformSirecAffectation(makeData(0))).toThrow(SirecDataError);
    });

    it('should ignore the national entite id (1) and not transcode it', () => {
      const result = transformSirecAffectation(makeData(1, [693]));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
    });

    it('should throw SirecDataError when only the national entite id (1) is present', () => {
      expect(() => transformSirecAffectation(makeData(1))).toThrow(SirecDataError);
    });
  });

  describe('groupIds', () => {
    it('should add ARS from groupId to requeteEntiteIds', () => {
      const result = transformSirecAffectation(makeData(null, [677]));

      expect(result.requeteEntiteIds).toEqual(['ars-grand-est']);
    });

    it('should add service and ARS from groupId to both requeteEntiteIds and situationEntiteIds', () => {
      const result = transformSirecAffectation(makeData(null, [1115]));

      expect(result.requeteEntiteIds).toEqual(['ars-normandie']);
      expect(result.situationEntiteIds).toContain('service-1');
      expect(result.situationEntiteIds).toContain('ars-normandie');
    });

    it('should deduplicate requeteEntiteIds between groupIds and service_gestionnaire', () => {
      const result = transformSirecAffectation(makeData(693, [677]));

      expect(result.requeteEntiteIds).toContain('ars-normandie');
      expect(result.requeteEntiteIds).toContain('ars-grand-est');
      expect(result.requeteEntiteIds).toHaveLength(2);
    });

    it('should satisfy the non-empty check with groupIds alone', () => {
      expect(() => transformSirecAffectation(makeData(null, [693]))).not.toThrow();
    });

    it('should still throw SirecDataError when service_gestionnaire and groupIds are empty', () => {
      expect(() => transformSirecAffectation(makeData(null, []))).toThrow(SirecDataError);
    });
  });

  describe('mainCourantes', () => {
    it('should add ARS from a mainCourante groupId to requeteEntiteIds', () => {
      const result = transformSirecAffectation(makeData(null, [], [{ groupIds: [677] }]));

      expect(result.requeteEntiteIds).toEqual(['ars-grand-est']);
    });
  });

  describe('unknown ids', () => {
    it('should propagate SirecTranscoError for an unknown service_gestionnaire', () => {
      expect(() => transformSirecAffectation(makeData(9999))).toThrow(SirecTranscoError);
    });

    it('should propagate SirecTranscoError for an unknown groupId', () => {
      expect(() => transformSirecAffectation(makeData(null, [9999]))).toThrow(SirecTranscoError);
    });
  });
});
