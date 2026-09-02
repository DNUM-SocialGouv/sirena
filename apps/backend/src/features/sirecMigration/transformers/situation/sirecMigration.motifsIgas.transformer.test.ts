import { describe, expect, it, vi } from 'vitest';
import type { SirecMcIgasMotif } from '../../sirecMigration.repository.js';
import { resolveMotifsIgas } from './sirecMigration.motifsIgas.transformer.js';

vi.mock('../../transco/motifsIgas.transco.js', () => ({
  transcodeMotifIgas: vi.fn((idIgas: number) => {
    if (idIgas === 20) return ['HOTELLERIE_LOCAUX_RESTAURATION/ADMISSION', 'HOTELLERIE_LOCAUX_RESTAURATION/ACCUEIL'];
    if (idIgas === 153) return ['ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/AUTRES'];
    if (idIgas === 122) return ['FACTURATIONS_HONORAIRES/AUTRES'];
    if (idIgas === 10) return ['HOTELLERIE_LOCAUX_RESTAURATION/AUTRES'];
    throw new Error(`unmocked idIgas ${idIgas}`);
  }),
  getParentMotifIgasId: vi.fn((idIgas: number) => (idIgas === 20 ? 10 : undefined)),
}));

vi.mock('@sirena/common/constants', () => ({
  motifLabelsById: {
    'HOTELLERIE_LOCAUX_RESTAURATION/ADMISSION': 'Admission',
    'HOTELLERIE_LOCAUX_RESTAURATION/ACCUEIL': 'Accueil',
    'ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/AUTRES': 'Autres',
    'FACTURATIONS_HONORAIRES/AUTRES': 'Autres',
  },
  motifCategoriesById: {
    'HOTELLERIE_LOCAUX_RESTAURATION/ADMISSION': 'Hôtellerie locaux restauration',
    'HOTELLERIE_LOCAUX_RESTAURATION/ACCUEIL': 'Hôtellerie locaux restauration',
    'ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/AUTRES': "Activités d'esthétique non réglementées",
    'FACTURATIONS_HONORAIRES/AUTRES': 'Facturations et honoraires',
  },
}));

const outMotif = (idIgas: number): SirecMcIgasMotif => ({ id_igas: idIgas, igas_type: 'out' });
const inMotif = (idIgas: number): SirecMcIgasMotif => ({ id_igas: idIgas, igas_type: 'in' });

describe('sirecMigration.motifsIgas.transformer.ts', () => {
  it('should return empty motifs and no commentaire suffix when there are no motifs', () => {
    expect(resolveMotifsIgas([])).toEqual({ motifs: [], commentaireSuffix: null });
  });

  it('should use out motifs as motifs when only out motifs are present', () => {
    const result = resolveMotifsIgas([outMotif(153)]);

    expect(result).toEqual({ motifs: ['ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/AUTRES'], commentaireSuffix: null });
  });

  it('should use in motifs as motifs when only in motifs are present', () => {
    const result = resolveMotifsIgas([inMotif(153)]);

    expect(result).toEqual({ motifs: ['ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/AUTRES'], commentaireSuffix: null });
  });

  it('should prefer out motifs and put in motifs in the commentaire suffix when both are present', () => {
    const result = resolveMotifsIgas([outMotif(153), inMotif(122)]);

    expect(result.motifs).toEqual(['ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/AUTRES']);
    expect(result.commentaireSuffix).toBe("Motifs IGAS d'entrée :\n- Facturations et honoraires / Autres");
  });

  it('should not set a commentaire suffix when out motifs are present but no in motifs exist', () => {
    const result = resolveMotifsIgas([outMotif(153)]);

    expect(result.commentaireSuffix).toBeNull();
  });

  it('should list one label per line in the commentaire suffix for multiple in motifs', () => {
    const result = resolveMotifsIgas([outMotif(153), inMotif(20)]);

    expect(result.commentaireSuffix).toBe(
      "Motifs IGAS d'entrée :\n- Hôtellerie locaux restauration / Admission\n- Hôtellerie locaux restauration / Accueil",
    );
  });

  it('should deduplicate motif ids resolved from multiple id_igas values', () => {
    const result = resolveMotifsIgas([outMotif(20), outMotif(20)]);

    expect(result.motifs).toEqual([
      'HOTELLERIE_LOCAUX_RESTAURATION/ADMISSION',
      'HOTELLERIE_LOCAUX_RESTAURATION/ACCUEIL',
    ]);
  });

  it('should ignore a parent motif when one of its child motifs is also present', () => {
    const result = resolveMotifsIgas([outMotif(10), outMotif(20)]);

    expect(result.motifs).toEqual([
      'HOTELLERIE_LOCAUX_RESTAURATION/ADMISSION',
      'HOTELLERIE_LOCAUX_RESTAURATION/ACCUEIL',
    ]);
  });

  it('should still migrate a parent motif when none of its children are present', () => {
    const result = resolveMotifsIgas([outMotif(10)]);

    expect(result.motifs).toEqual(['HOTELLERIE_LOCAUX_RESTAURATION/AUTRES']);
  });

  it('should only exclude a parent motif within the same igas_type as its present child', () => {
    const result = resolveMotifsIgas([outMotif(10), inMotif(20)]);

    expect(result.motifs).toEqual(['HOTELLERIE_LOCAUX_RESTAURATION/AUTRES']);
    expect(result.commentaireSuffix).toBe(
      "Motifs IGAS d'entrée :\n- Hôtellerie locaux restauration / Admission\n- Hôtellerie locaux restauration / Accueil",
    );
  });
});
