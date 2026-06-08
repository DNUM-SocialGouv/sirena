import { describe, expect, it, vi } from 'vitest';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecReponseProvenances } from './sirecMigration.reponseProvenance.transformer.js';

vi.mock('../../transco/dictionnaire.transco.js', () => ({
  SIREC_DICO: {
    103: 'Institution 1',
    104: 'Institution 2',
    105: 'Institution 3',
  },
}));

vi.mock('../../transco/affectation.transco.js', () => ({
  transcodeAffectation: vi.fn((id: number) => {
    if (id === 693) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: [] };
    if (id === 677) return { requeteEntiteIds: ['ars-grand-est'], situationEntiteIds: [] };
    if (id === 680) return { requeteEntiteIds: ['ars-idf'], situationEntiteIds: [] };
    throw new SirecTranscoError(id, 'affectation');
  }),
}));

const makeData = (
  reclamationOverrides: {
    date_rep_provenance1?: Date | null;
    date_rep_provenance2?: Date | null;
    date_rep_provenance3?: Date | null;
  } = {},
  provenances: { id_provenance: number; id_group: number }[] = [],
) => ({
  reclamation: {
    id_data: 42,
    date_rep_provenance1: null,
    date_rep_provenance2: null,
    date_rep_provenance3: null,
    ...reclamationOverrides,
  },
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances: provenances.map((p) => ({
    date_signalement: null,
    reponse_attendue: null,
    ...p,
  })),
  institutionPartenaires: {},
  typeTraitementIdDicos: [],
  misEnCauses: [],
});

describe('sirecMigration.reponseProvenance.transformer.ts', () => {
  it('should return an empty array when there are no provenances', () => {
    const result = transformSirecReponseProvenances(makeData({ date_rep_provenance1: new Date() }, []));

    expect(result).toEqual([]);
  });

  it('should return an empty array when all dates are null', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: null, date_rep_provenance2: null, date_rep_provenance3: null }, [
        { id_provenance: 103, id_group: 693 },
      ]),
    );

    expect(result).toEqual([]);
  });

  it('should skip provenance when its date is null', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: null, date_rep_provenance2: new Date('2024-05-10') }, [
        { id_provenance: 103, id_group: 693 },
        { id_provenance: 104, id_group: 677 },
      ]),
    );

    expect(result).toHaveLength(1);
    expect(result[0].nom).toBe("Réponse à l'institution de provenance : Institution 2");
  });

  it('should create an etape with the correct nom', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103, id_group: 693 }]),
    );

    expect(result[0].nom).toBe("Réponse à l'institution de provenance : Institution 1");
  });

  it('should set entiteId from transcodeAffectation', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103, id_group: 693 }]),
    );

    expect(result[0].entiteId).toBe('ars-normandie');
  });

  it('should set statutId to FAIT', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103, id_group: 693 }]),
    );

    expect(result[0].statutId).toBe('FAIT');
  });

  it('should set createdAt to the date', () => {
    const date = new Date('2024-03-05');
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: date }, [{ id_provenance: 103, id_group: 693 }]),
    );

    expect(result[0].createdAt).toEqual(date);
  });

  it('should set note to "Date de la réponse : DD/MM/YYYY"', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103, id_group: 693 }]),
    );

    expect(result[0].note).toBe('Date de la réponse : 05/03/2024');
  });

  it('should handle three provenances with three dates', () => {
    const date1 = new Date('2024-01-10');
    const date2 = new Date('2024-02-15');
    const date3 = new Date('2024-03-20');
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: date1, date_rep_provenance2: date2, date_rep_provenance3: date3 }, [
        { id_provenance: 103, id_group: 693 },
        { id_provenance: 104, id_group: 677 },
        { id_provenance: 105, id_group: 680 },
      ]),
    );

    expect(result).toHaveLength(3);
    expect(result[0].nom).toBe("Réponse à l'institution de provenance : Institution 1");
    expect(result[0].createdAt).toEqual(date1);
    expect(result[1].nom).toBe("Réponse à l'institution de provenance : Institution 2");
    expect(result[1].createdAt).toEqual(date2);
    expect(result[2].nom).toBe("Réponse à l'institution de provenance : Institution 3");
    expect(result[2].createdAt).toEqual(date3);
  });

  it('should ignore date_rep_provenance beyond index of provenances', () => {
    const result = transformSirecReponseProvenances(
      makeData(
        {
          date_rep_provenance1: new Date('2024-01-01'),
          date_rep_provenance2: new Date('2024-01-02'),
        },
        [{ id_provenance: 103, id_group: 693 }],
      ),
    );

    expect(result).toHaveLength(1);
  });

  it('should throw SirecTranscoError for an unknown id_provenance', () => {
    expect(() =>
      transformSirecReponseProvenances(
        makeData({ date_rep_provenance1: new Date() }, [{ id_provenance: 9999, id_group: 693 }]),
      ),
    ).toThrow(SirecTranscoError);
  });

  it('should propagate SirecTranscoError from transcodeAffectation for an unknown id_group', () => {
    expect(() =>
      transformSirecReponseProvenances(
        makeData({ date_rep_provenance1: new Date() }, [{ id_provenance: 103, id_group: 9999 }]),
      ),
    ).toThrow(SirecTranscoError);
  });
});
