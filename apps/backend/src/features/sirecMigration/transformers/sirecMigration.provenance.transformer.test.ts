import { describe, expect, it, vi } from 'vitest';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transformSirecProvenances } from './sirecMigration.provenance.transformer.js';

vi.mock('../transco/dictionnaire.transco.js', () => ({
  SIREC_DICO: {
    103: 'Institution 1',
    104: 'Institution 2',
    134: 'Réponse attendue type A',
  },
}));

vi.mock('../transco/affectation.transco.js', () => ({
  transcodeAffectation: vi.fn((id: number) => {
    if (id === 693) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: [] };
    if (id === 677) return { requeteEntiteIds: ['ars-grand-est'], situationEntiteIds: [] };
    throw new SirecTranscoError(id, 'affectation');
  }),
}));

const makeData = (
  provenances: {
    id_provenance: number;
    id_group: number;
    date_signalement?: Date | null;
    reponse_attendue?: number | null;
  }[],
) => ({
  reclamation: { id_data: 42 },
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances: provenances.map((p) => ({
    date_signalement: null,
    reponse_attendue: null,
    ...p,
  })),
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

    expect(result[0].nom).toBe('Institution 1');
    expect(result[0].entiteId).toBe('ars-normandie');
    expect(result[1].nom).toBe('Institution 2');
    expect(result[1].entiteId).toBe('ars-grand-est');
  });

  describe('date_signalement note', () => {
    it('should format a date as "Date de réception à l\'institution de provenance : DD/MM/YYYY"', () => {
      const result = transformSirecProvenances(
        makeData([{ id_provenance: 103, id_group: 693, date_signalement: new Date('2024-03-05') }]),
      );

      expect(result[0].note).toContain("Date de réception à l'institution de provenance : 05/03/2024");
    });

    it('should produce "Date de réception non renseignée" when date_signalement is null', () => {
      const result = transformSirecProvenances(
        makeData([{ id_provenance: 103, id_group: 693, date_signalement: null }]),
      );

      expect(result[0].note).toContain('Date de réception non renseignée');
    });
  });

  describe('reponse_attendue note', () => {
    it('should transcode reponse_attendue via SIREC_DICO and prefix with "Réponse attendue : "', () => {
      const result = transformSirecProvenances(
        makeData([{ id_provenance: 103, id_group: 693, reponse_attendue: 134 }]),
      );

      expect(result[0].note).toContain('Réponse attendue : Réponse attendue type A');
    });

    it('should produce "Réponse attendue non précisée" when reponse_attendue is null', () => {
      const result = transformSirecProvenances(
        makeData([{ id_provenance: 103, id_group: 693, reponse_attendue: null }]),
      );

      expect(result[0].note).toContain('Réponse attendue non précisée');
    });

    it('should throw SirecTranscoError for an unknown reponse_attendue id', () => {
      expect(() =>
        transformSirecProvenances(makeData([{ id_provenance: 103, id_group: 693, reponse_attendue: 9999 }])),
      ).toThrow(SirecTranscoError);
    });
  });

  it('should join both lines into a single note with newline separator', () => {
    const result = transformSirecProvenances(
      makeData([
        { id_provenance: 103, id_group: 693, date_signalement: new Date('2024-01-15'), reponse_attendue: 134 },
      ]),
    );

    expect(result[0].note).toContain("Date de réception à l'institution de provenance");
    expect(result[0].note).toContain('Réponse attendue');
    expect(result[0].note).toContain('\n');
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
