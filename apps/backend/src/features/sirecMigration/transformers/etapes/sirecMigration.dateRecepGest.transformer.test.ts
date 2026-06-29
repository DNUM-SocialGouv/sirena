import { describe, expect, it, vi } from 'vitest';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transformSirecDateRecepGest } from './sirecMigration.dateRecepGest.transformer.js';

vi.mock('../../transco/affectation/affectation.transco.js', () => ({
  getAffectationLabel: vi.fn((id: number | null) => {
    if (id === 693) return 'ARS Normandie';
    return null;
  }),
}));

const makeData = (date_recep_gest: Date | null, service_recepteur_niv1: number | null = null) =>
  ({
    reclamation: {
      id_data: 42,
      date_recep_gest,
      service_recepteur_niv1,
    },
    motifsDeclaresIdDicos: [],
    groupIds: [],
    provenances: [],
    institutionPartenaires: {},
    typeTraitementIdDicos: [],
    mainCourantes: [],
    misEnCauses: [],
  }) as unknown as SirecReclamationData;

const ARS_1 = 'ars-normandie';
const ARS_2 = 'ars-grand-est';

describe('sirecMigration.dateRecepGest.transformer.ts', () => {
  describe('null case', () => {
    it('should return empty array when date_recep_gest is null', () => {
      const result = transformSirecDateRecepGest(makeData(null), [ARS_1]);

      expect(result).toEqual([]);
    });
  });

  describe('with date', () => {
    it('should create one etape per arsEntiteId', () => {
      const result = transformSirecDateRecepGest(makeData(new Date('2024-03-15')), [ARS_1, ARS_2]);

      expect(result).toHaveLength(2);
      expect(result[0].entiteId).toBe(ARS_1);
      expect(result[1].entiteId).toBe(ARS_2);
    });

    it('should set nom to "Réception au service de premier niveau"', () => {
      const result = transformSirecDateRecepGest(makeData(new Date()), [ARS_1]);

      expect(result[0].nom).toBe('Réception au service de premier niveau');
    });

    it('should set statutId to FAIT', () => {
      const result = transformSirecDateRecepGest(makeData(new Date()), [ARS_1]);

      expect(result[0].statutId).toBe('FAIT');
    });

    it('should set createdAt to date_recep_gest', () => {
      const date = new Date('2024-05-10');
      const result = transformSirecDateRecepGest(makeData(date), [ARS_1]);

      expect(result[0].createdAt).toEqual(date);
    });

    it('should set dateRealisation to date_recep_gest', () => {
      const date = new Date('2024-05-10');
      const result = transformSirecDateRecepGest(makeData(date), [ARS_1]);

      expect(result[0].dateRealisation).toEqual(date);
    });
  });

  describe('note', () => {
    it('should include formatted date on first line', () => {
      const date = new Date('2024-03-15');
      const result = transformSirecDateRecepGest(makeData(date), [ARS_1]);

      expect(result[0].note).toContain('Date de répcetion au service de premier niveau : 15/03/2024');
    });

    it('should include service label on second line when service_recepteur_niv1 is known', () => {
      const date = new Date('2024-03-15');
      const result = transformSirecDateRecepGest(makeData(date, 693), [ARS_1]);

      expect(result[0].note).toBe(
        'Date de répcetion au service de premier niveau : 15/03/2024\nService de premier niveau : ARS Normandie',
      );
    });

    it('should omit service line when service_recepteur_niv1 is null', () => {
      const date = new Date('2024-03-15');
      const result = transformSirecDateRecepGest(makeData(date, null), [ARS_1]);

      expect(result[0].note).toBe('Date de répcetion au service de premier niveau : 15/03/2024');
    });

    it('should omit service line when service_recepteur_niv1 is unknown', () => {
      const date = new Date('2024-03-15');
      const result = transformSirecDateRecepGest(makeData(date, 9999), [ARS_1]);

      expect(result[0].note).toBe('Date de répcetion au service de premier niveau : 15/03/2024');
    });
  });

  describe('empty arsEntiteIds', () => {
    it('should return empty array even when date_recep_gest is set', () => {
      const result = transformSirecDateRecepGest(makeData(new Date()), []);

      expect(result).toEqual([]);
    });
  });
});
