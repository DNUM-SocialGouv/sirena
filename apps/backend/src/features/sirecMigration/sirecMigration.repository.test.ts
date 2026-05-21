import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mysqlPool } from '../../config/mysql.js';
import { fetchSirecReclamationById } from './sirecMigration.repository.js';

vi.mock('../../config/mysql.js', () => ({
  mysqlPool: {
    query: vi.fn(),
  },
}));

describe('sirecMigration.repository.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the row when found', async () => {
    const mockRow = { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation' };
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
