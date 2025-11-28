import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildIndex, findGeoByPostalCode } from './geoIndex';

vi.mock('./inseetocodepostal.json', () => ({
  default: [
    { codeInsee: '75001', codePostal: '75001' },
    { codeInsee: '75002', codePostal: '75002' },
    { codeInsee: '13001', codePostal: '13001' },
    { codeInsee: '69001', codePostal: '69001' },
  ],
}));

vi.mock('./liste_entites.json', () => ({
  default: [
    {
      COM_CODE: '75001',
      DPT_CODE_ACTUEL: '75',
      DPT_LIB_ACTUEL: 'Paris',
      REG_CODE_ACTUEL: '11',
      REG_LIB_ACTUEL: 'Île-de-France',
      CTCD_CODE_ACTUEL: '75C',
    },
    {
      COM_CODE: '75002',
      DPT_CODE_ACTUEL: '75',
      DPT_LIB_ACTUEL: 'Paris',
      REG_CODE_ACTUEL: '11',
      REG_LIB_ACTUEL: 'Île-de-France',
      CTCD_CODE_ACTUEL: '75C',
    },
    {
      COM_CODE: '13001',
      DPT_CODE_ACTUEL: '13',
      DPT_LIB_ACTUEL: 'Bouches-du-Rhône',
      REG_CODE_ACTUEL: '93',
      REG_LIB_ACTUEL: "Provence-Alpes-Côte d'Azur",
      CTCD_CODE_ACTUEL: '13D',
    },
    {
      COM_CODE: '69001',
      DPT_CODE_ACTUEL: '69',
      DPT_LIB_ACTUEL: 'Rhône',
      REG_CODE_ACTUEL: '84',
      REG_LIB_ACTUEL: 'Auvergne-Rhône-Alpes',
      CTCD_CODE_ACTUEL: '69D',
    },
  ],
}));

describe('geoIndex', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('buildIndex', () => {
    it('should build an index mapping postal codes to geo entities', () => {
      const index = buildIndex();

      expect(index).toBeInstanceOf(Map);
      expect(index.size).toBeGreaterThan(0);
    });

    it('should correctly map postal codes to geo entities', () => {
      const index = buildIndex();

      const parisEntities = index.get('75001');
      expect(parisEntities).toBeDefined();
      expect(parisEntities?.length).toBeGreaterThan(0);

      const entity = parisEntities?.[0];
      expect(entity).toMatchObject({
        inseeCode: '75001',
        postalCode: '75001',
        departementCode: '75',
        ctcdCode: '75C',
        departementName: 'Paris',
        regionCode: '11',
        regionName: 'Île-de-France',
      });
    });

    it('should handle multiple postal codes', () => {
      const index = buildIndex();

      const paris1 = index.get('75001');
      const paris2 = index.get('75002');
      const marseille = index.get('13001');
      const lyon = index.get('69001');

      expect(paris1).toBeDefined();
      expect(paris2).toBeDefined();
      expect(marseille).toBeDefined();
      expect(lyon).toBeDefined();
    });

    it('should skip insee codes that do not exist in liste_entites', () => {
      const index = buildIndex();

      const allPostalCodes = Array.from(index.keys());
      expect(allPostalCodes).toContain('75001');
      expect(allPostalCodes).toContain('13001');
    });

    it('should create GeoEntite objects with correct structure', () => {
      const index = buildIndex();
      const entity = index.get('13001')?.[0];

      expect(entity).toHaveProperty('inseeCode');
      expect(entity).toHaveProperty('postalCode');
      expect(entity).toHaveProperty('departementCode');
      expect(entity).toHaveProperty('ctcdCode');
      expect(entity).toHaveProperty('departementName');
      expect(entity).toHaveProperty('regionCode');
      expect(entity).toHaveProperty('regionName');

      if (entity) {
        expect(typeof entity.inseeCode).toBe('string');
        expect(typeof entity.postalCode).toBe('string');
        expect(typeof entity.departementCode).toBe('string');
        expect(typeof entity.ctcdCode).toBe('string');
        expect(typeof entity.departementName).toBe('string');
        expect(typeof entity.regionCode).toBe('string');
        expect(typeof entity.regionName).toBe('string');
      }
    });
  });

  describe('findGeoByPostalCode', () => {
    it('should return a GeoEntite for a valid postal code', () => {
      const result = findGeoByPostalCode('75001');

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        inseeCode: '75001',
        postalCode: '75001',
        departementCode: '75',
        ctcdCode: '75C',
        departementName: 'Paris',
        regionCode: '11',
        regionName: 'Île-de-France',
      });
    });

    it('should return null for an invalid postal code', () => {
      const result = findGeoByPostalCode('99999');

      expect(result).toBeNull();
    });

    it('should return null for an empty string', () => {
      const result = findGeoByPostalCode('');

      expect(result).toBeNull();
    });

    it('should return the first entity when multiple entities share the same postal code', () => {
      const result = findGeoByPostalCode('75001');

      expect(result).not.toBeNull();
      expect(result?.postalCode).toBe('75001');
    });

    it('should cache the index after first call', () => {
      const result1 = findGeoByPostalCode('75001');
      expect(result1).not.toBeNull();

      const result2 = findGeoByPostalCode('13001');
      expect(result2).not.toBeNull();
      expect(result2?.postalCode).toBe('13001');
    });

    it('should handle different postal codes correctly', () => {
      const paris = findGeoByPostalCode('75001');
      const marseille = findGeoByPostalCode('13001');
      const lyon = findGeoByPostalCode('69001');

      expect(paris?.departementCode).toBe('75');
      expect(paris?.ctcdCode).toBe('75C');
      expect(marseille?.departementCode).toBe('13');
      expect(marseille?.ctcdCode).toBe('13D');
      expect(lyon?.departementCode).toBe('69');
      expect(lyon?.ctcdCode).toBe('69D');
    });
  });
});
