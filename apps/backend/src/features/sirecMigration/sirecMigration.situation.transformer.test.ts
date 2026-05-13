import { describe, expect, it } from 'vitest';
import { transformSirecSituation } from './sirecMigration.situation.transformer.js';

describe('sirecMigration.situation.transformer.ts', () => {
  it('should return an empty object', () => {
    const row = { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation' };

    const result = transformSirecSituation(row);

    expect(result).toEqual({});
  });
});
