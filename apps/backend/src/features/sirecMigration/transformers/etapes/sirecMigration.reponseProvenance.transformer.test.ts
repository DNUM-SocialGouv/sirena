import { describe, expect, it, vi } from 'vitest';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecReponseProvenances } from './sirecMigration.reponseProvenance.transformer.js';

vi.mock('../../transco/dictionnaire.transco.js', () => ({
  SIREC_DICO: {
    103: 'Institution 1',
    104: 'Institution 2',
    105: 'Institution 3',
  },
}));

const makeData = (
  reclamationOverrides: {
    date_rep_provenance1?: Date | null;
    date_rep_provenance2?: Date | null;
    date_rep_provenance3?: Date | null;
    sys_creation_date?: Date | null;
  } = {},
  provenances: { id_provenance: number }[] = [],
) =>
  ({
    reclamation: {
      id_data: 42,
      date_rep_provenance1: null,
      date_rep_provenance2: null,
      date_rep_provenance3: null,
      sys_creation_date: null,
      ...reclamationOverrides,
    },
    motifsDeclaresIdDicos: [],
    groupIds: [],
    institutionPartenaires: {},
    typeTraitementIdDicos: [],
    mainCourantes: [],
    provenances: provenances.map((p) => ({
      date_signalement: null,
      reponse_attendue: null,
      ...p,
    })),
    misEnCauses: [],
  }) as unknown as SirecReclamationData;

const ARS_IDS = ['ars-normandie', 'ars-grand-est'];

describe('sirecMigration.reponseProvenance.transformer.ts', () => {
  it('should return an empty array when there are no provenances', () => {
    const result = transformSirecReponseProvenances(makeData({ date_rep_provenance1: new Date() }, []), ARS_IDS);

    expect(result).toEqual([]);
  });

  it('should return an empty array when all dates are null', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: null, date_rep_provenance2: null, date_rep_provenance3: null }, [
        { id_provenance: 103 },
      ]),
      ARS_IDS,
    );

    expect(result).toEqual([]);
  });

  it('should return an empty array when arsEntiteIds is empty', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date() }, [{ id_provenance: 103 }]),
      [],
    );

    expect(result).toEqual([]);
  });

  it('should skip provenance when its date is null', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: null, date_rep_provenance2: new Date('2024-05-10') }, [
        { id_provenance: 103 },
        { id_provenance: 104 },
      ]),
      ['ars-normandie'],
    );

    expect(result).toHaveLength(1);
    expect(result[0].nom).toBe("Réponse à l'institution de provenance : Institution 2");
  });

  it('should create an etape with the correct nom', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103 }]),
      ['ars-normandie'],
    );

    expect(result[0].nom).toBe("Réponse à l'institution de provenance : Institution 1");
  });

  it('should create one etape per arsEntiteId', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103 }]),
      ARS_IDS,
    );

    expect(result).toHaveLength(2);
    expect(result[0].entiteId).toBe('ars-normandie');
    expect(result[1].entiteId).toBe('ars-grand-est');
  });

  it('should set statutId to FAIT', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103 }]),
      ['ars-normandie'],
    );

    expect(result[0].statutId).toBe('FAIT');
  });

  it('should set dateRealisation to the date', () => {
    const date = new Date('2024-03-05');
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: date }, [{ id_provenance: 103 }]),
      ['ars-normandie'],
    );

    expect(result[0].dateRealisation).toEqual(date);
  });

  it('should set createdAt from sys_creation_date', () => {
    const sysDate = new Date('2024-01-01');
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05'), sys_creation_date: sysDate }, [{ id_provenance: 103 }]),
      ['ars-normandie'],
    );

    expect(result[0].createdAt).toEqual(sysDate);
  });

  it('should set note to "Date de la réponse : DD/MM/YYYY"', () => {
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103 }]),
      ['ars-normandie'],
    );

    expect(result[0].note).toBe('Date de la réponse : 05/03/2024');
  });

  it('should handle three provenances with three dates', () => {
    const date1 = new Date('2024-01-10');
    const date2 = new Date('2024-02-15');
    const date3 = new Date('2024-03-20');
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: date1, date_rep_provenance2: date2, date_rep_provenance3: date3 }, [
        { id_provenance: 103 },
        { id_provenance: 104 },
        { id_provenance: 105 },
      ]),
      ['ars-normandie'],
    );

    expect(result).toHaveLength(3);
    expect(result[0].nom).toBe("Réponse à l'institution de provenance : Institution 1");
    expect(result[0].dateRealisation).toEqual(date1);
    expect(result[1].nom).toBe("Réponse à l'institution de provenance : Institution 2");
    expect(result[1].dateRealisation).toEqual(date2);
    expect(result[2].nom).toBe("Réponse à l'institution de provenance : Institution 3");
    expect(result[2].dateRealisation).toEqual(date3);
  });

  it('should ignore date_rep_provenance beyond index of provenances', () => {
    const result = transformSirecReponseProvenances(
      makeData(
        {
          date_rep_provenance1: new Date('2024-01-01'),
          date_rep_provenance2: new Date('2024-01-02'),
        },
        [{ id_provenance: 103 }],
      ),
      ['ars-normandie'],
    );

    expect(result).toHaveLength(1);
  });

  it('should deduplicate etapes when several provenances resolve to the same entiteId and same id_provenance', () => {
    const date1 = new Date('2024-01-10');
    const date2 = new Date('2024-02-15');
    const result = transformSirecReponseProvenances(
      makeData({ date_rep_provenance1: date1, date_rep_provenance2: date2 }, [
        { id_provenance: 103 },
        { id_provenance: 103 },
      ]),
      ['ars-normandie'],
    );

    expect(result).toHaveLength(1);
    expect(result[0].entiteId).toBe('ars-normandie');
    expect(result[0].dateRealisation).toEqual(date1);
  });

  it('should throw SirecTranscoError for an unknown id_provenance', () => {
    expect(() =>
      transformSirecReponseProvenances(makeData({ date_rep_provenance1: new Date() }, [{ id_provenance: 9999 }]), [
        'ars-normandie',
      ]),
    ).toThrow(SirecTranscoError);
  });

  describe('sirecFileTypeKeys', () => {
    it('should target rep_instit_part<n> for the n-th provenance', () => {
      const date1 = new Date('2024-01-10');
      const date2 = new Date('2024-02-15');
      const date3 = new Date('2024-03-20');
      const result = transformSirecReponseProvenances(
        makeData({ date_rep_provenance1: date1, date_rep_provenance2: date2, date_rep_provenance3: date3 }, [
          { id_provenance: 103 },
          { id_provenance: 104 },
          { id_provenance: 105 },
        ]),
        ['ars-normandie'],
      );

      expect(result[0].sirecFileTypeKeys).toEqual(['rep_instit_part1']);
      expect(result[1].sirecFileTypeKeys).toEqual(['rep_instit_part2']);
      expect(result[2].sirecFileTypeKeys).toEqual(['rep_instit_part3']);
    });

    it('should set the same sirecFileTypeKeys on every etape created for the same provenance across ARS entités', () => {
      const result = transformSirecReponseProvenances(
        makeData({ date_rep_provenance1: new Date('2024-03-05') }, [{ id_provenance: 103 }]),
        ARS_IDS,
      );

      expect(result[0].sirecFileTypeKeys).toEqual(['rep_instit_part1']);
      expect(result[1].sirecFileTypeKeys).toEqual(['rep_instit_part1']);
    });
  });
});
