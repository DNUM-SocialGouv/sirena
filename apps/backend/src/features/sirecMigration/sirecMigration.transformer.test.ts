import { describe, expect, it } from 'vitest';
import { transformSirecReclamation } from './sirecMigration.transformer.js';

describe('sirecMigration.transformer.ts', () => {
  it('should map all fields correctly', () => {
    const row = { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation' };

    const result = transformSirecReclamation(row);

    expect(result).toEqual({
      sirenaId: 'SIREC-42',
      sirecId: 42,
      receptionDate: new Date('2024-01-15'),
      situation: {
        fait: { autresPrecisions: 'Ma réclamation' },
      },
    });
  });

  it('should map id_data to sirecId', () => {
    const row = { id_data: 999, r_recept_date: null, description: null };

    const result = transformSirecReclamation(row);

    expect(result.sirecId).toBe(999);
  });
});
