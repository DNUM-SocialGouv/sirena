import { describe, expect, it } from 'vitest';
import { getParentMotifIgasId, transcodeMotifIgas } from './motifsIgas.transco.js';

describe('motifsIgas.transco.ts', () => {
  it('should transcode a known id_igas to a single SIRENA motif id', () => {
    expect(transcodeMotifIgas(153)).toEqual(['ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/AUTRES']);
  });

  it('should transcode an id_igas mapping to multiple SIRENA motif ids', () => {
    expect(transcodeMotifIgas(20)).toEqual([
      'HOTELLERIE_LOCAUX_RESTAURATION/ADMISSION',
      'HOTELLERIE_LOCAUX_RESTAURATION/ACCUEIL',
    ]);
  });

  it('should transcode multiple ids mapping to the same SIRENA value', () => {
    expect(transcodeMotifIgas(146)).toEqual(['ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/NON_RESPECT_REGLES']);
    expect(transcodeMotifIgas(148)).toEqual(['ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/NON_RESPECT_REGLES']);
  });

  describe('getParentMotifIgasId', () => {
    it('should return the parent id_igas for a motif that has one', () => {
      expect(getParentMotifIgasId(20)).toBe(10);
      expect(getParentMotifIgasId(153)).toBe(19);
    });

    it('should return undefined for a top-level motif with no parent', () => {
      expect(getParentMotifIgasId(10)).toBeUndefined();
    });

    it('should return undefined for an unknown id_igas', () => {
      expect(getParentMotifIgasId(99999)).toBeUndefined();
    });
  });

  // it('should throw SirecDataError for an unknown id_igas', () => {
  //   expect(() => transcodeMotifIgas(99999)).toThrow(SirecDataError);
  // });
  //
  // it('should include the unknown id_igas in the error message', () => {
  //   expect(() => transcodeMotifIgas(99999)).toThrow(/99999/);
  // });
  //
  // it('should throw SirecDataError when the resolved SIRENA motif has no label in MOTIFS_HIERARCHICAL_DATA', async () => {
  //   vi.resetModules();
  //   vi.doMock('@sirena/common/constants', () => ({ motifLabelsById: {} }));
  //
  //   const { transcodeMotifIgas: transcodeWithMissingLabels } = await import('./motifsIgas.transco.js');
  //
  //   expect(() => transcodeWithMissingLabels(153)).toThrow(/n'a pas de libellé/);
  //
  //   vi.doUnmock('@sirena/common/constants');
  //   vi.resetModules();
  // });
});
