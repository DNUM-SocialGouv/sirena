import { describe, expect, it, vi } from 'vitest';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecReceptionProvenances } from './sirecMigration.receptionProvenance.transformer.js';

vi.mock('../../transco/dictionnaire.transco.js', () => ({
  SIREC_DICO: {
    103: 'Institution 1',
    104: 'Institution 2',
    134: 'Réponse attendue type A',
  },
}));

const makeData = (
  provenances: {
    id_provenance: number;
    date_signalement?: Date | null;
    reponse_attendue?: number | null;
  }[],
) =>
  ({
    reclamation: { id_data: 42 },
    motifsDeclaresIdDicos: [],
    groupIds: [],
    provenances: provenances.map((p) => ({
      date_signalement: null,
      reponse_attendue: null,
      ...p,
    })),
    institutionPartenaires: {},
    typeTraitementIdDicos: [],
    mainCourantes: [],
    misEnCauses: [],
  }) as unknown as SirecReclamationData;

const ARS_IDS = ['ars-normandie', 'ars-grand-est'];

describe('sirecMigration.provenance.transformer.ts', () => {
  it('should return an empty array when there are no provenances', () => {
    const result = transformSirecReceptionProvenances(makeData([]), ARS_IDS);

    expect(result).toEqual([]);
  });

  it('should return an empty array when arsEntiteIds is empty', () => {
    const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103 }]), []);

    expect(result).toEqual([]);
  });

  it('should map id_provenance to nom via SIREC_DICO', () => {
    const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103 }]), ['ars-normandie']);

    expect(result[0].nom).toBe("Réception à l'institution de provenance : Institution 1");
  });

  it('should set statutId to FAIT', () => {
    const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103 }]), ['ars-normandie']);

    expect(result[0].statutId).toBe('FAIT');
  });

  it('should create one etape per arsEntiteId', () => {
    const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103 }]), ARS_IDS);

    expect(result).toHaveLength(2);
    expect(result[0].entiteId).toBe('ars-normandie');
    expect(result[1].entiteId).toBe('ars-grand-est');
  });

  it('should handle multiple provenances', () => {
    const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103 }, { id_provenance: 104 }]), [
      'ars-normandie',
    ]);

    expect(result[0].nom).toBe("Réception à l'institution de provenance : Institution 1");
    expect(result[0].entiteId).toBe('ars-normandie');
    expect(result[1].nom).toBe("Réception à l'institution de provenance : Institution 2");
    expect(result[1].entiteId).toBe('ars-normandie');
  });

  describe('date_signalement note', () => {
    it('should format a date as "Date de réception à l\'institution de provenance : DD/MM/YYYY"', () => {
      const result = transformSirecReceptionProvenances(
        makeData([{ id_provenance: 103, date_signalement: new Date('2024-03-05') }]),
        ['ars-normandie'],
      );

      expect(result[0].note).toContain("Date de réception à l'institution de provenance : 05/03/2024");
    });

    it('should produce "Date de réception non renseignée" when date_signalement is null', () => {
      const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103, date_signalement: null }]), [
        'ars-normandie',
      ]);

      expect(result[0].note).toContain('Date de réception non renseignée');
    });
  });

  describe('reponse_attendue note', () => {
    it('should transcode reponse_attendue via SIREC_DICO and prefix with "Réponse attendue : "', () => {
      const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103, reponse_attendue: 134 }]), [
        'ars-normandie',
      ]);

      expect(result[0].note).toContain('Réponse attendue : Réponse attendue type A');
    });

    it('should produce "Réponse attendue non précisée" when reponse_attendue is null', () => {
      const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103, reponse_attendue: null }]), [
        'ars-normandie',
      ]);

      expect(result[0].note).toContain('Réponse attendue non précisée');
    });

    it('should throw SirecTranscoError for an unknown reponse_attendue id', () => {
      expect(() =>
        transformSirecReceptionProvenances(makeData([{ id_provenance: 103, reponse_attendue: 9999 }]), [
          'ars-normandie',
        ]),
      ).toThrow(SirecTranscoError);
    });
  });

  it('should join both lines into a single note with newline separator', () => {
    const result = transformSirecReceptionProvenances(
      makeData([{ id_provenance: 103, date_signalement: new Date('2024-01-15'), reponse_attendue: 134 }]),
      ['ars-normandie'],
    );

    expect(result[0].note).toContain("Date de réception à l'institution de provenance");
    expect(result[0].note).toContain('Réponse attendue');
    expect(result[0].note).toContain('\n');
  });

  it('should deduplicate etapes with the same id_provenance and entiteId', () => {
    const result = transformSirecReceptionProvenances(makeData([{ id_provenance: 103 }, { id_provenance: 103 }]), [
      'ars-normandie',
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].entiteId).toBe('ars-normandie');
  });

  it('should throw SirecTranscoError for an unknown id_provenance', () => {
    expect(() => transformSirecReceptionProvenances(makeData([{ id_provenance: 9999 }]), ['ars-normandie'])).toThrow(
      SirecTranscoError,
    );
  });
});
