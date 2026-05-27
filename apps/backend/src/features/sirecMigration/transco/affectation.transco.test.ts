import { describe, expect, it } from 'vitest';
import { filterArsEntiteIds, transcodeAffectation } from './affectation.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

const ARS_NORMANDIE_ID = '4af829ff-07c1-425d-85d6-83b5f97e4422';

describe('affectation.transco.ts', () => {
  describe('ARS ids', () => {
    it('should return the ARS entiteId in requeteEntiteIds and empty situationEntiteIds', () => {
      const result = transcodeAffectation(693); // ARS Normandie

      expect(result).toEqual({
        requeteEntiteIds: [ARS_NORMANDIE_ID],
        situationEntiteIds: [],
      });
    });

    it('should map each ARS id to its SIRENA entiteId', () => {
      expect(transcodeAffectation(667).requeteEntiteIds).toEqual(['4988789e-9775-4958-861f-52f03cbc9257']);
      expect(transcodeAffectation(677).requeteEntiteIds).toEqual(['359e7f37-7344-4680-8b78-3101a01b073c']);
      expect(transcodeAffectation(701).requeteEntiteIds).toEqual(['acf617c0-892a-4af1-a757-125409ffccdd']);
    });

    it('should map multiple SIREC ARS ids to the same SIRENA entiteId', () => {
      expect(transcodeAffectation(683).requeteEntiteIds).toEqual(transcodeAffectation(685).requeteEntiteIds);
    });
  });

  describe('service ids (ARS Normandie)', () => {
    it('should return service entiteIds and ARS Normandie in situationEntiteIds', () => {
      const result = transcodeAffectation(1115);

      expect(result.requeteEntiteIds).toEqual([ARS_NORMANDIE_ID]);
      expect(result.situationEntiteIds).toContain('c773bd6f-73e8-479c-b552-fd72f91c2efb');
      expect(result.situationEntiteIds).toContain(ARS_NORMANDIE_ID);
    });

    it('should include multiple service entiteIds when one SIREC id maps to several', () => {
      const result = transcodeAffectation(1093);

      expect(result.situationEntiteIds).toContain('f7e2a9c5-4b8d-4e16-9f0a-3d6c2b8e1f7a');
      expect(result.situationEntiteIds).toContain('8d4b1e6f-a3c9-4f72-b5d0-1e9a7c4f2b8d');
      expect(result.requeteEntiteIds).toEqual([ARS_NORMANDIE_ID]);
    });
  });

  describe('filterArsEntiteIds', () => {
    it('should return only ARS entiteIds from the input list', () => {
      const result = filterArsEntiteIds([ARS_NORMANDIE_ID, 'c773bd6f-73e8-479c-b552-fd72f91c2efb', 'unknown-id']);

      expect(result).toEqual([ARS_NORMANDIE_ID]);
    });

    it('should return an empty array when no ARS entiteId is present', () => {
      const result = filterArsEntiteIds(['service-id-1', 'service-id-2']);

      expect(result).toEqual([]);
    });

    it('should return all ARS entiteIds when input contains multiple ARS', () => {
      const arsGrandEst = '359e7f37-7344-4680-8b78-3101a01b073c';
      const result = filterArsEntiteIds([ARS_NORMANDIE_ID, arsGrandEst]);

      expect(result).toContain(ARS_NORMANDIE_ID);
      expect(result).toContain(arsGrandEst);
      expect(result).toHaveLength(2);
    });

    it('should return an empty array for an empty input', () => {
      expect(filterArsEntiteIds([])).toEqual([]);
    });
  });

  describe('unknown ids', () => {
    it('should throw SirecTranscoError for an unknown id', () => {
      expect(() => transcodeAffectation(9999)).toThrow(SirecTranscoError);
    });

    it('should include the unknown id and table name in the error', () => {
      try {
        transcodeAffectation(9999);
      } catch (err) {
        expect(err).toBeInstanceOf(SirecTranscoError);
        expect((err as SirecTranscoError).idDico).toBe(9999);
        expect((err as SirecTranscoError).tableName).toBe('affectation');
      }
    });
  });
});
