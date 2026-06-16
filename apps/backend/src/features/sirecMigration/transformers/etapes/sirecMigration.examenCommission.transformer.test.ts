import { describe, expect, it } from 'vitest';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transformSirecExamenCommission } from './sirecMigration.examenCommission.transformer.js';

const makeData = (date_commission: Date | null = null) =>
  ({
    reclamation: { id_data: 42, date_commission },
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

describe('sirecMigration.examenCommission.transformer.ts', () => {
  it('should return an empty array when date_commission is null', () => {
    const result = transformSirecExamenCommission(makeData(null), [ARS_1]);

    expect(result).toEqual([]);
  });

  it('should create one etape per arsEntiteId when date_commission is set', () => {
    const result = transformSirecExamenCommission(makeData(new Date('2024-04-10')), [ARS_1, ARS_2]);

    expect(result).toHaveLength(2);
    expect(result[0].entiteId).toBe(ARS_1);
    expect(result[1].entiteId).toBe(ARS_2);
  });

  it('should set nom to "Examen en commission"', () => {
    const result = transformSirecExamenCommission(makeData(new Date()), [ARS_1]);

    expect(result[0].nom).toBe('Examen en commission');
  });

  it('should set statutId to FAIT', () => {
    const result = transformSirecExamenCommission(makeData(new Date()), [ARS_1]);

    expect(result[0].statutId).toBe('FAIT');
  });

  it('should set createdAt to date_commission', () => {
    const date = new Date('2024-06-15');
    const result = transformSirecExamenCommission(makeData(date), [ARS_1]);

    expect(result[0].createdAt).toEqual(date);
  });

  it('should set note with formatted date', () => {
    const date = new Date('2024-06-15');
    const result = transformSirecExamenCommission(makeData(date), [ARS_1]);

    expect(result[0].note).toBe("Date d'examen en commission : 15/06/2024");
  });
});
