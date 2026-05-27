import { describe, expect, it, vi } from 'vitest';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecProvenances } from './sirecMigration.provenance.transformer.js';

vi.mock('../transco/dictionnaire.transco.js', () => ({
  SIREC_DICO: {
    103: 'Institution 1',
    104: 'Institution 2',
  },
}));

vi.mock('../transco/affectation.transco.js', () => ({
  transcodeAffectation: vi.fn((id: number) => {
    if (id === 693) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: [] };
    if (id === 677) return { requeteEntiteIds: ['ars-grand-est'], situationEntiteIds: [] };
    throw new SirecTranscoError(id, 'affectation');
  }),
}));

const makeData = (provenances: { id_provenance: number; id_group: number }[]) => ({
  reclamation: { id_data: 42 },
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances,
});

describe('sirecMigration.provenance.transformer.ts', () => {
  it('should return an empty array when there are no provenances', () => {
    const result = transformSirecProvenances(makeData([]));

    expect(result).toEqual([]);
  });

  it('should map id_provenance to nom via SIREC_DICO', () => {
    const result = transformSirecProvenances(makeData([{ id_provenance: 103, id_group: 693 }]));

    expect(result[0].nom).toBe('Institution 1');
  });

  it('should map id_group to entiteId via transcodeAffectation', () => {
    const result = transformSirecProvenances(makeData([{ id_provenance: 103, id_group: 693 }]));

    expect(result[0].entiteId).toBe('ars-normandie');
  });

  it('should handle multiple provenances', () => {
    const result = transformSirecProvenances(
      makeData([
        { id_provenance: 103, id_group: 693 },
        { id_provenance: 104, id_group: 677 },
      ]),
    );

    expect(result).toEqual([
      { nom: 'Institution 1', entiteId: 'ars-normandie' },
      { nom: 'Institution 2', entiteId: 'ars-grand-est' },
    ]);
  });

  it('should throw SirecTranscoError for an unknown id_provenance', () => {
    expect(() => transformSirecProvenances(makeData([{ id_provenance: 9999, id_group: 693 }]))).toThrow(
      SirecTranscoError,
    );
  });

  it('should propagate SirecTranscoError from transcodeAffectation for an unknown id_group', () => {
    expect(() => transformSirecProvenances(makeData([{ id_provenance: 103, id_group: 9999 }]))).toThrow(
      SirecTranscoError,
    );
  });
});
