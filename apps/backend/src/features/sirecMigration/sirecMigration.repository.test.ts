import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mysqlPool } from '../../config/mysql.js';
import {
  fetchSirecData,
  fetchSirecGroupIds,
  fetchSirecInstitutionPartenaires,
  fetchSirecMisEnCauses,
  fetchSirecMotifsDeclaresById,
  fetchSirecProvenances,
  fetchSirecReclamationById,
  fetchSirecTypeTraitementIds,
} from './sirecMigration.repository.js';

vi.mock('../../config/mysql.js', () => ({
  mysqlPool: {
    query: vi.fn(),
  },
}));

describe('sirecMigration.repository.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSirecReclamationById', () => {
    it('should return the row when found', async () => {
      const mockRow = {
        id_data: 42,
        r_recept_date: new Date('2024-01-15'),
        description: 'Ma réclamation',
        reception: 12,
        prioritaire: 1,
        service_recepteur_niv1: 693,
        service_gestionnaire: null,
      };
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[mockRow], []]);

      const result = await fetchSirecReclamationById(42);

      expect(result).toEqual(mockRow);
      expect(mysqlPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_reclamation_data'), [42]);
    });

    it('should return null when not found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      const result = await fetchSirecReclamationById(99);

      expect(result).toBeNull();
    });

    it('should pass the sirecId as parameter', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      await fetchSirecReclamationById(123);

      expect(mysqlPool.query).toHaveBeenCalledWith(expect.any(String), [123]);
    });
  });

  describe('fetchSirecMotifsDeclaresById', () => {
    it('should return the list of id_dico when found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[{ id_dico: 823 }, { id_dico: 809 }], []]);

      const result = await fetchSirecMotifsDeclaresById(42);

      expect(result).toEqual([823, 809]);
      expect(mysqlPool.query).toHaveBeenCalledWith(
        expect.stringContaining('sire_reclamation_dico_motifs_declares_data'),
        [42],
      );
    });

    it('should return an empty array when no motifs found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      const result = await fetchSirecMotifsDeclaresById(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecGroupIds', () => {
    it('should return the list of group ids when found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[{ id_group: 3 }, { id_group: 5 }], []]);

      const result = await fetchSirecGroupIds(42);

      expect(result).toEqual([3, 5]);
      expect(mysqlPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_reclamation_data_group'), [42]);
    });

    it('should return an empty array when no groups found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      const result = await fetchSirecGroupIds(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecProvenances', () => {
    it('should return provenances with all fields when found', async () => {
      const date = new Date('2024-03-05');
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([
        [{ id_provenance: 103, id_group: 693, date_signalement: date, reponse_attendue: 134 }],
        [],
      ]);

      const result = await fetchSirecProvenances(42);

      expect(result).toEqual([{ id_provenance: 103, id_group: 693, date_signalement: date, reponse_attendue: 134 }]);
      expect(mysqlPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_provenances_data'), [42]);
    });

    it('should handle null date_signalement and reponse_attendue', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([
        [{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }],
        [],
      ]);

      const result = await fetchSirecProvenances(42);

      expect(result).toEqual([{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }]);
    });

    it('should return an empty array when no provenances found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      const result = await fetchSirecProvenances(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecInstitutionPartenaires', () => {
    it('should return a map of id_data to institution name', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([
        [
          { id_data: 10, institution: 'CPAM de Rouen' },
          { id_data: 20, institution: 'DREETS Normandie' },
        ],
        [],
      ]);

      const result = await fetchSirecInstitutionPartenaires([10, 20]);

      expect(result).toEqual({ 10: 'CPAM de Rouen', 20: 'DREETS Normandie' });
      expect(mysqlPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_institution_data'), [[10, 20]]);
    });

    it('should return an empty object without querying when ids is empty', async () => {
      const result = await fetchSirecInstitutionPartenaires([]);

      expect(result).toEqual({});
      expect(mysqlPool.query).not.toHaveBeenCalled();
    });
  });

  describe('fetchSirecTypeTraitementIds', () => {
    it('should return the list of id_dico when found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[{ id_dico: 344 }, { id_dico: 346 }], []]);

      const result = await fetchSirecTypeTraitementIds(42);

      expect(result).toEqual([344, 346]);
      expect(mysqlPool.query).toHaveBeenCalledWith(
        expect.stringContaining('sire_reclamation_dico_type_traitement_data'),
        [42],
      );
    });

    it('should return an empty array when no types found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      const result = await fetchSirecTypeTraitementIds(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecMisEnCauses', () => {
    it('should return mis en cause with their group ids', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([
        [
          { id_data: 10, id_group: 693 },
          { id_data: 10, id_group: 677 },
          { id_data: 20, id_group: 693 },
        ],
        [],
      ]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result).toEqual([
        { id_data: 10, groupIds: [693, 677] },
        { id_data: 20, groupIds: [693] },
      ]);
      expect(mysqlPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_misencause_data'), [42]);
    });

    it('should return mis en cause with empty groupIds when no groups are linked', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[{ id_data: 10, id_group: null }], []]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result).toEqual([{ id_data: 10, groupIds: [] }]);
    });

    it('should return an empty array when no mis en cause found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecData', () => {
    const mockRow = {
      id_data: 42,
      r_recept_date: new Date('2024-01-15'),
      description: 'Ma réclamation',
      reception: 12,
      prioritaire: 1,
      service_recepteur_niv1: 693,
      service_gestionnaire: null,
      institution_part: null,
    };

    it('should return the aggregate data when the reclamation is found', async () => {
      vi.mocked(mysqlPool.query)
        .mockResolvedValueOnce([[mockRow], []])
        .mockResolvedValueOnce([[{ id_dico: 823 }, { id_dico: 809 }], []])
        .mockResolvedValueOnce([[{ id_group: 3 }, { id_group: 5 }], []])
        .mockResolvedValueOnce([
          [{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }],
          [],
        ])
        .mockResolvedValueOnce([[{ id_dico: 344 }], []])
        .mockResolvedValueOnce([[], []]);

      const result = await fetchSirecData(42);

      expect(result).toEqual({
        reclamation: mockRow,
        motifsDeclaresIdDicos: [823, 809],
        groupIds: [3, 5],
        provenances: [{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }],
        institutionPartenaires: {},
        typeTraitementIdDicos: [344],
        misEnCauses: [],
      });
    });

    it('should fetch institution partenaires when institution_part contains numeric ids', async () => {
      const rowWithInstitutions = { ...mockRow, institution_part: '10,20' };
      vi.mocked(mysqlPool.query)
        .mockResolvedValueOnce([[rowWithInstitutions], []])
        .mockResolvedValueOnce([[{ id_dico: 823 }], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([
          [
            { id_data: 10, institution: 'CPAM de Rouen' },
            { id_data: 20, institution: 'DREETS Normandie' },
          ],
          [],
        ])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []]);

      const result = await fetchSirecData(42);

      expect(result?.institutionPartenaires).toEqual({ 10: 'CPAM de Rouen', 20: 'DREETS Normandie' });
    });

    it('should not query institutions when institution_part has no numeric ids', async () => {
      const rowWithTextPart = { ...mockRow, institution_part: 'Autre institution' };
      vi.mocked(mysqlPool.query)
        .mockResolvedValueOnce([[rowWithTextPart], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[], []]);

      const result = await fetchSirecData(42);

      expect(result?.institutionPartenaires).toEqual({});
      expect(mysqlPool.query).toHaveBeenCalledTimes(6);
    });

    it('should return null when the reclamation is not found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      const result = await fetchSirecData(99);

      expect(result).toBeNull();
    });

    it('should not query motifs or groupIds when the reclamation is not found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      await fetchSirecData(99);

      expect(mysqlPool.query).toHaveBeenCalledOnce();
    });
  });
});
