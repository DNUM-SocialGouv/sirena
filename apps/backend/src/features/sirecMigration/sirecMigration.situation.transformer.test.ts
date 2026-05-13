import { describe, expect, it } from 'vitest';
import { transformSirecSituation } from './sirecMigration.situation.transformer.js';

describe('sirecMigration.situation.transformer.ts', () => {
  it('should map description to autresPrecisions in fait', () => {
    const row = { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation' };

    const result = transformSirecSituation(row);

    expect(result).toEqual({
      fait: { autresPrecisions: 'Ma réclamation' },
    });
  });

  it('should default autresPrecisions to empty string when description is null', () => {
    const row = { id_data: 42, r_recept_date: null, description: null };

    const result = transformSirecSituation(row);

    expect(result.fait.autresPrecisions).toBe('');
  });
});
