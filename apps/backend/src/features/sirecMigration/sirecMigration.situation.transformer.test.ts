import { describe, expect, it } from 'vitest';
import { transformSirecSituation } from './sirecMigration.situation.transformer.js';

describe('sirecMigration.situation.transformer.ts', () => {
  const sirecData = {
    reclamation: { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation', dest: null },
    motifsDeclaresIdDicos: [809],
  };

  it('should map description to fait.autresPrecisions', () => {
    const result = transformSirecSituation(sirecData, []);

    expect(result.fait.autresPrecisions).toBe('Ma réclamation');
  });

  it('should transcode motifsDeclaresIdDicos into fait.motifsDeclaratifs', () => {
    const result = transformSirecSituation({ ...sirecData, motifsDeclaresIdDicos: [809, 811] }, []);

    expect(result.fait.motifsDeclaratifs).toEqual(['PROBLEME_FACTURATION', 'PROBLEME_LOCAUX']);
  });

  it('should produce an empty motifsDeclaratifs when no motifs are provided', () => {
    const result = transformSirecSituation({ ...sirecData, motifsDeclaresIdDicos: [] }, []);

    expect(result.fait.motifsDeclaratifs).toEqual([]);
  });

  it('should pass entiteIds through to the result', () => {
    const result = transformSirecSituation(sirecData, ['service-1', 'ars-normandie']);

    expect(result.entiteIds).toEqual(['service-1', 'ars-normandie']);
  });

  it('should have an empty entiteIds when none are provided', () => {
    const result = transformSirecSituation(sirecData, []);

    expect(result.entiteIds).toEqual([]);
  });
});
