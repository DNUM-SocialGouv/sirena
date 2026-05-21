import { describe, expect, it } from 'vitest';
import { transformSirecReclamation } from './sirecMigration.transformer.js';

describe('sirecMigration.transformer.ts', () => {
  const sirecData = {
    reclamation: {
      id_data: 42,
      r_recept_date: new Date('2024-01-15'),
      description: 'Ma réclamation',
      reception: 12,
      prioritaire: 1,
      prioritaire_precisez: 'Précision prioritaire',
      dest: null,
      saisine: null as number | null,
      courrier_signal: null as number | null,
      plaignant: null as number | null,
      plaignant_anonyme: null as number | null,
      plaignant_est_anonyme: null as number | null,
      plaignant_type: null as number | null,
      plaignant_adresse: null as string | null,
      plaignant_adresse_complement: null as string | null,
      requerant_adresse: null as string | null,
      requerant_cp: null as string | null,
      requerant_ville: null as string | null,
      preciser_statut: null as string | null,
      plaignant_rs: null as string | null,
      nom_representant: null as string | null,
      prenom_representant: null as string | null,
      plaignant_nom: null as string | null,
      plaignant_prenom: null as string | null,
      plaignant_mail: null as string | null,
      plaignant_tel: null as string | null,
      service_recepteur_niv1: 693,
      service_gestionnaire: null,
    },
    motifsDeclaresIdDicos: [809],
  };

  it('should map all fields correctly', () => {
    const result = transformSirecReclamation(sirecData);

    expect(result).toEqual({
      sirenaId: 'SIREC-42',
      sirecId: 42,
      receptionDate: new Date('2024-01-15'),
      receptionTypeId: 'EMAIL',
      prioriteId: 'HAUTE',
      declarant: null,
      requeteEntiteIds: ['4af829ff-07c1-425d-85d6-83b5f97e4422'],
      situation: {
        fait: {
          commentaire: 'Précision prioritaire',
          autresPrecisions: 'Ma réclamation',
          motifsDeclaratifs: ['PROBLEME_FACTURATION'],
        },
        entiteIds: [],
        demarchesIds: [],
      },
    });
  });

  it('should map service_recepteur_niv1 to requeteEntiteIds via affectation transco', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, service_recepteur_niv1: 1115, service_gestionnaire: null },
    });

    expect(result.requeteEntiteIds).toEqual(['4af829ff-07c1-425d-85d6-83b5f97e4422']);
    expect(result.situation.entiteIds).toContain('c773bd6f-73e8-479c-b552-fd72f91c2efb');
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

  it('should map prioritaire=1 to prioriteId HAUTE', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire: 1 },
    });

    expect(result.prioriteId).toBe('HAUTE');
  });

  it('should map prioritaire=0 to null prioriteId', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire: 0 },
    });

    expect(result.prioriteId).toBeNull();
  });

  it('should map null prioritaire to null prioriteId', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire: null },
    });

    expect(result.prioriteId).toBeNull();
  });
});
