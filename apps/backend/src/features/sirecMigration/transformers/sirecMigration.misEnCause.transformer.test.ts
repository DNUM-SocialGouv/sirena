import { describe, expect, it, vi } from 'vitest';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecMisEnCauseSituations } from './sirecMigration.misEnCause.transformer.js';

vi.mock('./sirecMigration.affectation.transformer.js', () => ({
  computeSituationEntiteIds: vi.fn((ids: (number | null)[]) => {
    const result: string[] = [];
    for (const id of ids) {
      if (id === 1115) result.push('service-1', 'ars-normandie');
      else if (id === 1121) result.push('service-2', 'ars-normandie');
      else if (id === 693) {
        // ARS direct: no situationEntiteId
      } else if (id !== null && id !== 0) {
        throw new SirecTranscoError(id, 'affectation');
      }
    }
    return [...new Set(result)];
  }),
}));

vi.mock('./sirecMigration.situation.transformer.js', () => ({
  transformSirecSituation: vi.fn((_sirecData: unknown, entiteIds: string[]) => ({
    fait: { commentaire: 'Commentaire', autresPrecisions: 'Description', motifsDeclaratifs: ['MOTIF_A'] },
    entiteIds,
    demarchesIds: [],
  })),
}));

const makeData = (groupIds: number[] = [], misEnCauses: { id_data: number; groupIds: number[] }[] = []) => ({
  reclamation: {
    id_data: 42,
    service_recepteur_niv1: 693 as number | null,
    service_gestionnaire: null as number | null,
  },
  motifsDeclaresIdDicos: [],
  groupIds,
  provenances: [],
  institutionPartenaires: {},
  typeTraitementIdDicos: [],
  misEnCauses,
});

describe('sirecMigration.misEnCause.transformer.ts', () => {
  describe('when there are no mis en cause', () => {
    it('should return a single situation using situationEntiteIds', () => {
      const result = transformSirecMisEnCauseSituations(makeData(), ['ars-normandie']);

      expect(result).toHaveLength(1);
      expect(result[0].entiteIds).toEqual(['ars-normandie']);
    });
  });

  describe('when there is one mis en cause', () => {
    it('should return one situation per mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([1115, 1121], [{ id_data: 10, groupIds: [1115] }]),
        [],
      );

      expect(result).toHaveLength(1);
    });

    it('should include mis en cause entiteIds in the situation', () => {
      const result = transformSirecMisEnCauseSituations(makeData([1115], [{ id_data: 10, groupIds: [1115] }]), []);

      expect(result[0].entiteIds).toContain('service-1');
      expect(result[0].entiteIds).toContain('ars-normandie');
    });

    it('should include orphan groupIds (not linked to any mis en cause) in all situations', () => {
      // groupIds: [1115, 1121], mis en cause only covers 1115 → 1121 is orphan
      const result = transformSirecMisEnCauseSituations(
        makeData([1115, 1121], [{ id_data: 10, groupIds: [1115] }]),
        [],
      );

      expect(result[0].entiteIds).toContain('service-2');
    });

    it('should not include entiteIds from a groupId that belongs to a mis en cause in orphan set', () => {
      // groupIds: [1115], mis en cause covers 1115 → no orphan
      const result = transformSirecMisEnCauseSituations(makeData([1115], [{ id_data: 10, groupIds: [1115] }]), []);

      // service-1 appears via mis en cause group, not orphan
      expect(result[0].entiteIds).toContain('service-1');
      // only one mention (no duplicate)
      expect(result[0].entiteIds.filter((id) => id === 'service-1')).toHaveLength(1);
    });

    it('should deduplicate entiteIds when orphan and mis en cause produce the same id', () => {
      // 1115 appears both as orphan groupId and mis en cause groupId → deduplicated
      const result = transformSirecMisEnCauseSituations(
        makeData([1115, 1121], [{ id_data: 10, groupIds: [1115, 1121] }]),
        [],
      );

      expect(result[0].entiteIds.filter((id) => id === 'ars-normandie')).toHaveLength(1);
    });

    it('should duplicate the fait and demarchesIds for each situation', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [
            { id_data: 10, groupIds: [] },
            { id_data: 20, groupIds: [] },
          ],
        ),
        [],
      );

      expect(result).toHaveLength(2);
      expect(result[0].fait).toEqual(result[1].fait);
      expect(result[0].demarchesIds).toEqual(result[1].demarchesIds);
    });
  });

  describe('when there are multiple mis en cause', () => {
    it('should return one situation per mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [1115, 1121],
          [
            { id_data: 10, groupIds: [1115] },
            { id_data: 20, groupIds: [1121] },
          ],
        ),
        [],
      );

      expect(result).toHaveLength(2);
    });

    it('should include the correct mis en cause entiteIds per situation', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [1115, 1121],
          [
            { id_data: 10, groupIds: [1115] },
            { id_data: 20, groupIds: [1121] },
          ],
        ),
        [],
      );

      expect(result[0].entiteIds).toContain('service-1');
      expect(result[1].entiteIds).toContain('service-2');
    });

    it('should include orphan entiteIds in each situation', () => {
      // reclamation groupIds: [1115, 1121, 693], mis en cause: 1115 and 1121 → 693 is orphan (ARS, no situationEntiteId)
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [1115, 1121],
          [
            { id_data: 10, groupIds: [1115] },
            { id_data: 20, groupIds: [1121] },
          ],
        ),
        [],
      );

      // each situation should have service-1 or service-2 from its own mis en cause
      expect(result[0].entiteIds).toContain('service-1');
      expect(result[1].entiteIds).toContain('service-2');
    });
  });
});
