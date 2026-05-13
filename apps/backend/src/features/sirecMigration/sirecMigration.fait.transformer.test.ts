import { describe, expect, it, vi } from 'vitest';
import { transformSirecFait } from './sirecMigration.fait.transformer.js';

vi.mock('./transco/motifsDeclaratifs.transco.js', () => ({
  transcodeMotifsDeclaratifs: vi.fn((ids: number[]) => ids.map(String)),
}));

describe('sirecMigration.fait.transformer.ts', () => {
  const sirecData = {
    reclamation: { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation' },
    motifsDeclaresIdDicos: [809, 811],
  };

  it('should map description to autresPrecisions', () => {
    const result = transformSirecFait(sirecData);

    expect(result.autresPrecisions).toBe('Ma réclamation');
  });

  it('should default autresPrecisions to empty string when description is null', () => {
    const result = transformSirecFait({ ...sirecData, reclamation: { ...sirecData.reclamation, description: null } });

    expect(result.autresPrecisions).toBe('');
  });

  it('should delegate motif transcoding to transcodeMotifsDeclaratifs', async () => {
    const { transcodeMotifsDeclaratifs } = await import('./transco/motifsDeclaratifs.transco.js');

    transformSirecFait(sirecData);

    expect(transcodeMotifsDeclaratifs).toHaveBeenCalledWith([809, 811]);
  });
});
