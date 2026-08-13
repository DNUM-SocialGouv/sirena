import { describe, expect, it, vi } from 'vitest';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecMainCourantes } from './sirecMigration.mainCourante.transformer.js';

vi.mock('../../transco/dictionnaire.transco.js', () => ({
  SIREC_DICO: {
    100: 'Médiation',
    101: 'Enquête',
  },
}));

const makeData = (
  mainCourantes: {
    id_data: number;
    type_action1: number | null;
    commentaire: string | null;
    date_action: Date | null;
    sys_creation_date?: Date;
  }[] = [],
) => ({
  reclamation: { id_data: 42 } as never,
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances: [],
  institutionPartenaires: {},
  typeTraitementIdDicos: [],
  misEnCauses: [],
  mainCourantes: mainCourantes as never,
});

const ARS_IDS = ['ars-normandie', 'ars-grand-est'];

describe('sirecMigration.mainCourante.transformer.ts', () => {
  it('should return an empty array when there are no mains courantes', () => {
    expect(transformSirecMainCourantes(makeData([]), ARS_IDS)).toEqual([]);
  });

  it('should return an empty array when arsEntiteIds is empty', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null }]),
      [],
    );

    expect(result).toEqual([]);
  });

  it('should set nom to "Type de traitement : Non précisé" when type_action1 is null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null }]),
      ['ars-normandie'],
    );

    expect(result[0].nom).toBe('Type de traitement : Non précisé');
  });

  it('should set nom from SIREC_DICO when type_action1 is a known id', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: 100, commentaire: null, date_action: null }]),
      ['ars-normandie'],
    );

    expect(result[0].nom).toBe('Médiation');
  });

  it('should throw SirecTranscoError when type_action1 is an unknown id', () => {
    expect(() =>
      transformSirecMainCourantes(
        makeData([{ id_data: 1, type_action1: 9999, commentaire: null, date_action: null }]),
        ['ars-normandie'],
      ),
    ).toThrow(SirecTranscoError);
  });

  it('should create one etape per arsEntiteId', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null }]),
      ARS_IDS,
    );

    expect(result).toHaveLength(2);
    expect(result[0].entiteId).toBe('ars-normandie');
    expect(result[1].entiteId).toBe('ars-grand-est');
  });

  it('should set statutId to FAIT', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null }]),
      ['ars-normandie'],
    );

    expect(result[0].statutId).toBe('FAIT');
  });

  it('should set createdAt from sys_creation_date', () => {
    const sysDate = new Date('2024-01-01');
    const result = transformSirecMainCourantes(
      makeData([
        {
          id_data: 1,
          type_action1: null,
          commentaire: null,
          date_action: null,
          sys_creation_date: sysDate,
        },
      ]),
      ['ars-normandie'],
    );

    expect(result[0].createdAt).toEqual(sysDate);
  });

  it('should set dateRealisation to date_action when non-null', () => {
    const date = new Date('2024-06-15');
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: date }]),
      ['ars-normandie'],
    );

    expect(result[0].dateRealisation).toEqual(date);
  });

  it('should not set dateRealisation when date_action is null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null }]),
      ['ars-normandie'],
    );

    expect(result[0].dateRealisation).toBeUndefined();
  });

  it('should set note to null when both commentaire and date_action are null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null }]),
      ['ars-normandie'],
    );

    expect(result[0].note).toBeNull();
  });

  it('should set note with only commentaire when date_action is null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: 'RAS', date_action: null }]),
      ['ars-normandie'],
    );

    expect(result[0].note).toBe('Commentaire : RAS');
  });

  it('should set note with only date_action when commentaire is null', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: new Date('2024-06-15') }]),
      ['ars-normandie'],
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
        },
      ]),
      ['ars-normandie'],
    );

    expect(result[0].note).toBe("Commentaire : Traitement effectué\nDate de l'action : 15/06/2024");
  });

  it('should deduplicate etapes with the same id_data and entiteId', () => {
    const result = transformSirecMainCourantes(
      makeData([{ id_data: 1, type_action1: null, commentaire: null, date_action: null }]),
      ['ars-normandie', 'ars-normandie'],
    );

    expect(result).toHaveLength(1);
    expect(result[0].entiteId).toBe('ars-normandie');
  });

  it('should create etapes for multiple mains courantes', () => {
    const result = transformSirecMainCourantes(
      makeData([
        { id_data: 1, type_action1: 100, commentaire: null, date_action: null },
        { id_data: 2, type_action1: 101, commentaire: null, date_action: null },
      ]),
      ['ars-normandie'],
    );

    expect(result).toHaveLength(2);
    expect(result[0].nom).toBe('Médiation');
    expect(result[1].nom).toBe('Enquête');
  });
});
