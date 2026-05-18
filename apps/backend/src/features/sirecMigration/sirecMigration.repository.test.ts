import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mysqlPool } from '../../config/mysql.js';
import {
  fetchSirecData,
  fetchSirecMotifsDeclaresById,
  fetchSirecReclamationById,
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

  describe('fetchSirecData', () => {
    const mockRow = {
      id_data: 42,
      r_recept_date: new Date('2024-01-15'),
      description: 'Ma réclamation',
      reception: 12,
    };

    it('should return the aggregate data when the reclamation is found', async () => {
      vi.mocked(mysqlPool.query)
        .mockResolvedValueOnce([[mockRow], []])
        .mockResolvedValueOnce([[{ id_dico: 823 }, { id_dico: 809 }], []]);

      const result = await fetchSirecData(42);

      expect(result).toEqual({
        reclamation: mockRow,
        motifsDeclaresIdDicos: [823, 809],
      });
    });

    it('should return null when the reclamation is not found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      const result = await fetchSirecData(99);

      expect(result).toBeNull();
    });

    it('should not query motifs when the reclamation is not found', async () => {
      vi.mocked(mysqlPool.query).mockResolvedValueOnce([[], []]);

      await fetchSirecData(99);

      expect(mysqlPool.query).toHaveBeenCalledOnce();
    });
  });
});
