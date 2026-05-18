import { describe, expect, it } from 'vitest';
import { transformSirecReclamation } from './sirecMigration.transformer.js';

describe('sirecMigration.transformer.ts', () => {
  const sirecData = {
    reclamation: { id_data: 42, r_recept_date: new Date('2024-01-15'), description: 'Ma réclamation', reception: 12 },
    motifsDeclaresIdDicos: [809],
  };

  it('should map all fields correctly', () => {
    const result = transformSirecReclamation(sirecData);

    expect(result).toEqual({
      sirenaId: 'SIREC-42',
      sirecId: 42,
      receptionDate: new Date('2024-01-15'),
      receptionTypeId: 'EMAIL',
      situation: {
        fait: {
          autresPrecisions: 'Ma réclamation',
          motifsDeclaratifs: ['PROBLEME_FACTURATION'],
        },
      },
    });
  });

  it('should map id_data to sirecId', () => {
    const result = transformSirecReclamation({ ...sirecData, reclamation: { ...sirecData.reclamation, id_data: 999 } });

    expect(result.sirecId).toBe(999);
  });

  it('should map reception to receptionTypeId via transco', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, reception: 14 },
    });

    expect(result.receptionTypeId).toBe('TELEPHONE');
  });

  it('should map null reception to null receptionTypeId', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, reception: null },
    });

    expect(result.receptionTypeId).toBeNull();
  });
});
