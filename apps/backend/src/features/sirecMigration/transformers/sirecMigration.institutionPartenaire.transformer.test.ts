import { describe, expect, it } from 'vitest';
import { SirecDataError } from '../transco/sirecTransco.error.js';
import { transformSirecInstitutionsPartenaires } from './sirecMigration.institutionPartenaire.transformer.js';

const makeData = (
  overrides: {
    institution_part?: string | null;
    niv_competence_reclam?: number | null;
    date_transfert_instit1?: Date | null;
    date_transfert_instit2?: Date | null;
    date_transfert_instit3?: Date | null;
    prec_niv_comp?: string | null;
  } = {},
  institutionPartenaires: Record<number, string> = {},
) => ({
  reclamation: {
    id_data: 42,
    institution_part: null,
    niv_competence_reclam: null,
    date_transfert_instit1: null,
    date_transfert_instit2: null,
    date_transfert_instit3: null,
    prec_niv_comp: null,
    ...overrides,
  },
  motifsDeclaresIdDicos: [],
  groupIds: [],
  provenances: [],
  institutionPartenaires,
});

const ARS_1 = 'ars-normandie';
const ARS_2 = 'ars-grand-est';

describe('sirecMigration.institutionPartenaire.transformer.ts', () => {
  it('should return an empty array when institution_part is null', () => {
    const result = transformSirecInstitutionsPartenaires(
      makeData({ institution_part: null, niv_competence_reclam: 54 }),
      [ARS_1],
    );

    expect(result).toEqual([]);
  });

  it('should return an empty array when institution_part is empty string', () => {
    const result = transformSirecInstitutionsPartenaires(
      makeData({ institution_part: '', niv_competence_reclam: 54 }),
      [ARS_1],
    );

    expect(result).toEqual([]);
  });

  it('should return an empty array when niv_competence_reclam is null', () => {
    const result = transformSirecInstitutionsPartenaires(
      makeData({ institution_part: '1', niv_competence_reclam: null }, { 1: 'CHU de Paris' }),
      [ARS_1],
    );

    expect(result).toEqual([]);
  });

  it('should return an empty array when niv_competence_reclam is an unknown value', () => {
    const result = transformSirecInstitutionsPartenaires(
      makeData({ institution_part: '1', niv_competence_reclam: 99 }, { 1: 'CHU de Paris' }),
      [ARS_1],
    );

    expect(result).toEqual([]);
  });

  describe('nom prefix', () => {
    it('should prefix with "Réponse hors compétence à l\'institution : " when niv_competence_reclam is 52', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 52 }, { 1: 'CHU de Paris' }),
        [ARS_1],
      );

      expect(result[0].nom).toBe("Réponse hors compétence à l'institution : CHU de Paris");
    });

    it('should prefix with "Transfert à l\'institution : " when niv_competence_reclam is 54', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 54 }, { 1: 'CHU de Paris' }),
        [ARS_1],
      );

      expect(result[0].nom).toBe("Transfert à l'institution : CHU de Paris");
    });
  });

  describe('institution name resolution', () => {
    it('should look up numeric id in institutionPartenaires', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '5', niv_competence_reclam: 54 }, { 5: 'CPAM de Rouen' }),
        [ARS_1],
      );

      expect(result[0].nom).toBe("Transfert à l'institution : CPAM de Rouen");
    });

    it('should throw SirecDataError when numeric id is not found in institutionPartenaires', () => {
      expect(() =>
        transformSirecInstitutionsPartenaires(makeData({ institution_part: '999', niv_competence_reclam: 54 }, {}), [
          ARS_1,
        ]),
      ).toThrow(SirecDataError);
    });

    it('should use free-text token as institution name when not numeric', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: 'Autre institution', niv_competence_reclam: 54 }),
        [ARS_1],
      );

      expect(result[0].nom).toBe("Transfert à l'institution : Autre institution");
    });

    it('should handle a mix of numeric ids and free-text tokens', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1,Autre', niv_competence_reclam: 54 }, { 1: 'CPAM' }),
        [ARS_1],
      );

      expect(result[0].nom).toBe("Transfert à l'institution : CPAM");
      expect(result[1].nom).toBe("Transfert à l'institution : Autre");
    });
  });

  describe('multiple institutions', () => {
    it('should create one etape per institution', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1,2,3', niv_competence_reclam: 54 }, { 1: 'A', 2: 'B', 3: 'C' }),
        [ARS_1],
      );

      expect(result).toHaveLength(3);
    });

    it('should create one etape per institution per arsEntiteId', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1,2', niv_competence_reclam: 54 }, { 1: 'A', 2: 'B' }),
        [ARS_1, ARS_2],
      );

      expect(result).toHaveLength(4);
    });

    it('should assign the correct entiteId to each etape', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 54 }, { 1: 'A' }),
        [ARS_1, ARS_2],
      );

      expect(result[0].entiteId).toBe(ARS_1);
      expect(result[1].entiteId).toBe(ARS_2);
    });
  });

  describe('transfer date', () => {
    it('should use date_transfert_instit1 for niv_competence_reclam 52', () => {
      const date = new Date('2024-03-15');
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 52, date_transfert_instit1: date }, { 1: 'A' }),
        [ARS_1],
      );

      expect(result[0].note).toContain('Date de transfert : 15/03/2024');
      expect(result[0].createdAt).toEqual(date);
    });

    it('should use date_transfert_instit1 for the first institution', () => {
      const date = new Date('2024-03-15');
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 54, date_transfert_instit1: date }, { 1: 'A' }),
        [ARS_1],
      );

      expect(result[0].note).toContain('Date de transfert : 15/03/2024');
      expect(result[0].createdAt).toEqual(date);
    });

    it('should use date_transfert_instit2 for the second institution', () => {
      const date = new Date('2024-04-20');
      const result = transformSirecInstitutionsPartenaires(
        makeData(
          { institution_part: '1,2', niv_competence_reclam: 54, date_transfert_instit2: date },
          { 1: 'A', 2: 'B' },
        ),
        [ARS_1],
      );

      expect(result[1].note).toContain('Date de transfert : 20/04/2024');
      expect(result[1].createdAt).toEqual(date);
    });

    it('should use date_transfert_instit3 for the third institution', () => {
      const date = new Date('2024-05-25');
      const result = transformSirecInstitutionsPartenaires(
        makeData(
          { institution_part: '1,2,3', niv_competence_reclam: 54, date_transfert_instit3: date },
          { 1: 'A', 2: 'B', 3: 'C' },
        ),
        [ARS_1],
      );

      expect(result[2].note).toContain('Date de transfert : 25/05/2024');
      expect(result[2].createdAt).toEqual(date);
    });

    it('should produce "Date de transfert non renseignée" when date is null for the first institution', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 54, date_transfert_instit1: null }, { 1: 'A' }),
        [ARS_1],
      );

      expect(result[0].note).toContain('Date de transfert non renseignée');
    });

    it('should produce "Date de transfert non renseignée" for institutions beyond the third', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData(
          {
            institution_part: '1,2,3,4',
            niv_competence_reclam: 54,
            date_transfert_instit1: new Date('2024-01-01'),
            date_transfert_instit2: new Date('2024-01-02'),
            date_transfert_instit3: new Date('2024-01-03'),
          },
          { 1: 'A', 2: 'B', 3: 'C', 4: 'D' },
        ),
        [ARS_1],
      );

      expect(result[3].note).toContain('Date de transfert non renseignée');
      expect(result[3].createdAt).toBeUndefined();
    });

    it('should use date_transfert_instit1 for free-text institution', () => {
      const date = new Date('2024-06-10');
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: 'Autre', niv_competence_reclam: 54, date_transfert_instit1: date }),
        [ARS_1],
      );

      expect(result[0].note).toContain('Date de transfert : 10/06/2024');
    });
  });

  describe('statutId', () => {
    it('should set statutId to FAIT when date is available', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 54, date_transfert_instit1: new Date() }, { 1: 'A' }),
        [ARS_1],
      );

      expect(result[0].statutId).toBe('FAIT');
    });

    it('should set statutId to A_FAIRE when date is null', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 54, date_transfert_instit1: null }, { 1: 'A' }),
        [ARS_1],
      );

      expect(result[0].statutId).toBe('A_FAIRE');
    });
  });

  describe('prec_niv_comp in note', () => {
    it('should include "Précision : <value>" in note when prec_niv_comp is set', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData(
          { institution_part: '1', niv_competence_reclam: 54, prec_niv_comp: 'Précision quelconque' },
          { 1: 'A' },
        ),
        [ARS_1],
      );

      expect(result[0].note).toContain('Précision : Précision quelconque');
    });

    it('should not include précision line in note when prec_niv_comp is null', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData({ institution_part: '1', niv_competence_reclam: 54, prec_niv_comp: null }, { 1: 'A' }),
        [ARS_1],
      );

      expect(result[0].note).not.toContain('Précision');
    });

    it('should include prec_niv_comp in all etapes for multiple institutions', () => {
      const result = transformSirecInstitutionsPartenaires(
        makeData(
          { institution_part: '1,2', niv_competence_reclam: 54, prec_niv_comp: 'Note commune' },
          { 1: 'A', 2: 'B' },
        ),
        [ARS_1],
      );

      expect(result[0].note).toContain('Précision : Note commune');
      expect(result[1].note).toContain('Précision : Note commune');
    });

    it('should join date line and précision line with newline', () => {
      const date = new Date('2024-01-15');
      const result = transformSirecInstitutionsPartenaires(
        makeData(
          { institution_part: '1', niv_competence_reclam: 54, date_transfert_instit1: date, prec_niv_comp: 'Info' },
          { 1: 'A' },
        ),
        [ARS_1],
      );

      expect(result[0].note).toBe('Date de transfert : 15/01/2024\nPrécision : Info');
    });
  });
});
