import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mariadbPool } from '../../config/mariadb.js';
import { fetchSirecReclamationById } from './sirecMigration.repository.js';

vi.mock('../../config/mariadb.js', () => ({
  mariadbPool: {
    query: vi.fn(),
  },
}));

describe('sirecMigration.repository.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the row when found', async () => {
    const mockRow = { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation' };
    vi.mocked(mariadbPool.query).mockResolvedValueOnce([mockRow]);

    const result = await fetchSirecReclamationById(42);

    expect(result).toEqual(mockRow);
    expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_reclamation_data'), [42]);
  });

  it('should return null when not found', async () => {
    vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

    const result = await fetchSirecReclamationById(99);

    expect(result).toBeNull();
  });

  it('should pass the sirecId as parameter', async () => {
    vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

    await fetchSirecReclamationById(123);

    expect(mariadbPool.query).toHaveBeenCalledWith(expect.any(String), [123]);
  });
});
