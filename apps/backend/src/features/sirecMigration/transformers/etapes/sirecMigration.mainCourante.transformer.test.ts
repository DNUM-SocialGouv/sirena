import { describe, expect, it, vi } from 'vitest';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecMainCourantes } from './sirecMigration.mainCourante.transformer.js';

vi.mock('../../transco/dictionnaire.transco.js', () => ({
  SIREC_DICO: {
    100: 'Médiation',
    101: 'Enquête',
  },
}));

vi.mock('../../transco/affectation.transco.js', () => ({
  transcodeAffectation: vi.fn((id: number) => {
    if (id === 693) return { requeteEntiteIds: ['ars-normandie'], situationEntiteIds: [] };
    if (id === 677) return { requeteEntiteIds: ['ars-grand-est'], situationEntiteIds: [] };
    throw new SirecTranscoError(id, 'affectation');
  }),
}));

const makeData = (
  mainCourantes: {
    id_data: number;
    type_action1: number | null;
    commentaire: string | null;
    date_action: Date | null;
    groupIds: number[];
  }[] = [],
) => ({
  reclamation: { id_data: 42 } as never,
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances: [],
  institutionPartenaires: {},
  typeTraitementIdDicos: [],
  misEnCauses: [],
  mainCourantes,
});

describe('sirecMigration.mainCourante.transformer.ts', () => {
  it('should return an empty array when there are no mains courantes', () => {
    expect(transformSirecMainCourantes(makeData([]))).toEqual([]);
  });

  it('should return an empty array when a main courante has no groups', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [] }]),
    );

    expect(result).toEqual([]);
  });

  it('should set nom to "Type de traitement : Autre" when type_action1 is null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [693] }]),
    );

    expect(result[0].nom).toBe('Type de traitement : Autre');
  });

  it('should set nom from SIREC_DICO when type_action1 is a known id', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: 100, commentaire: null, date_action: null, groupIds: [693] }]),
    );

    expect(result[0].nom).toBe('Médiation');
  });

  it('should throw SirecTranscoError when type_action1 is an unknown id', () => {
    expect(() =>
      transformSirecMainCourantes(
        makeData([{ id_data: 1, type_action1: 9999, commentaire: null, date_action: null, groupIds: [693] }]),
      ),
    ).toThrow(SirecTranscoError);
  });

  it('should set entiteId from transcodeAffectation', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [693] }]),
    );

    expect(result[0].entiteId).toBe('ars-normandie');
  });

  it('should propagate SirecTranscoError for an unknown id_group', () => {
    expect(() =>
      transformSirecMainCourantes(
        makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [9999] }]),
      ),
    ).toThrow(SirecTranscoError);
  });

  it('should set statutId to FAIT', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [693] }]),
    );

    expect(result[0].statutId).toBe('FAIT');
  });

  it('should set createdAt to date_action when non-null', () => {
    const date = new Date('2024-06-15');
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: date, groupIds: [693] }]),
    );

    expect(result[0].createdAt).toEqual(date);
  });

  it('should not set createdAt when date_action is null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [693] }]),
    );

    expect(result[0].createdAt).toBeUndefined();
  });

  it('should set note to null when both commentaire and date_action are null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [693] }]),
    );

    expect(result[0].note).toBeNull();
  });

  it('should set note with only commentaire when date_action is null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: 'RAS', date_action: null, groupIds: [693] }]),
    );

    expect(result[0].note).toBe('Commentaire : RAS');
  });

  it('should set note with only date_action when commentaire is null', () => {
    const result = transformSirecMainCourantes(
      makeData([
        { id_data: 1, type_action1: null, commentaire: null, date_action: new Date('2024-06-15'), groupIds: [693] },
      ]),
    );

    expect(result[0].note).toBe("Date de l'action : 15/06/2024");
  });

  it('should set note with both commentaire and date_action when both are non-null', () => {
    const result = transformSirecMainCourantes(
      makeData([
        {
          id_data: 1,
          type_action1: null,
          commentaire: 'Traitement effectué',
          date_action: new Date('2024-06-15'),
          groupIds: [693],
        },
      ]),
    );

    expect(result[0].note).toBe("Commentaire : Traitement effectué\nDate de l'action : 15/06/2024");
  });

  it('should create one etape per group', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [693, 677] }]),
    );

    expect(result).toHaveLength(2);
    expect(result[0].entiteId).toBe('ars-normandie');
    expect(result[1].entiteId).toBe('ars-grand-est');
  });

  it('should deduplicate etapes with the same id_data and entiteId', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null, groupIds: [693, 693] }]),
    );

    expect(result).toHaveLength(1);
    expect(result[0].entiteId).toBe('ars-normandie');
  });

  it('should create etapes for multiple mains courantes', () => {
    const result = transformSirecMainCourantes(
      makeData([
        { id_data: 1, type_action1: 100, commentaire: null, date_action: null, groupIds: [693] },
        { id_data: 2, type_action1: 101, commentaire: null, date_action: null, groupIds: [677] },
      ]),
    );

    expect(result).toHaveLength(2);
    expect(result[0].nom).toBe('Médiation');
    expect(result[1].nom).toBe('Enquête');
  });
});
