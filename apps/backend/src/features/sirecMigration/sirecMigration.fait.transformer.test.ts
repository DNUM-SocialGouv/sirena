import { describe, expect, it } from 'vitest';
import { transformSirecFait } from './sirecMigration.fait.transformer.js';

describe('sirecMigration.fait.transformer.ts', () => {
  it('should map description to autresPrecisions', () => {
    const row = { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation détaillée' };

    const result = transformSirecFait(row);

    expect(result).toEqual({ autresPrecisions: 'Ma réclamation détaillée' });
  });

  it('should default autresPrecisions to empty string when description is null', () => {
    const row = { id_data: 42, r_recept_date: null, description: null };

    const result = transformSirecFait(row);

    expect(result.autresPrecisions).toBe('');
  });
});
