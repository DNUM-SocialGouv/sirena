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
      preciser_statut: null as string | null,
      plaignant_rs: null as string | null,
      nom_representant: null as string | null,
      prenom_representant: null as string | null,
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

  it('should map plaignant=34 to declarant with estVictime true', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant: 34 },
    });

    expect(result.declarant).toEqual({ estVictime: true, veutGarderAnonymat: null, commentaire: '' });
  });

  it('should map plaignant=36 to declarant with estVictime false', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant: 36 },
    });

    expect(result.declarant).toEqual({ estVictime: false, veutGarderAnonymat: null, commentaire: '' });
  });

  it('should map null plaignant to null declarant when all declarant fields are null', () => {
    const result = transformSirecReclamation(sirecData);

    expect(result.declarant).toBeNull();
  });

  it('should set declarant.commentaire when plaignant_est_anonyme=1', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_est_anonyme: 1 },
    });

    expect(result.declarant).toEqual({
      estVictime: null,
      veutGarderAnonymat: null,
      commentaire: 'Le requérant est anonyme : oui',
    });
  });

  it('should create declarant from plaignant_est_anonyme alone even if plaignant is null', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant: null, plaignant_est_anonyme: 1 },
    });

    expect(result.declarant).not.toBeNull();
  });

  it('should leave declarant.commentaire empty when plaignant_est_anonyme is null', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant: 34, plaignant_est_anonyme: null },
    });

    expect(result.declarant?.commentaire).toBe('');
  });

  it('should combine estVictime and commentaire when both plaignant and plaignant_est_anonyme are set', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant: 34, plaignant_est_anonyme: 1 },
    });

    expect(result.declarant).toEqual({
      estVictime: true,
      veutGarderAnonymat: null,
      commentaire: 'Le requérant est anonyme : oui',
    });
  });

  it('should map plaignant_anonyme=1 to declarant with veutGarderAnonymat true', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_anonyme: 1 },
    });

    expect(result.declarant?.veutGarderAnonymat).toBe(true);
  });

  it('should map plaignant_anonyme=112 to declarant with veutGarderAnonymat true', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_anonyme: 112 },
    });

    expect(result.declarant?.veutGarderAnonymat).toBe(true);
  });

  it('should map plaignant_anonyme=0 to declarant with veutGarderAnonymat false', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_anonyme: 0 },
    });

    expect(result.declarant?.veutGarderAnonymat).toBe(false);
  });

  it('should map plaignant_anonyme=111 to declarant with veutGarderAnonymat false', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_anonyme: 111 },
    });

    expect(result.declarant?.veutGarderAnonymat).toBe(false);
  });

  it('should map null plaignant_anonyme to null veutGarderAnonymat', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant: 34, plaignant_anonyme: null },
    });

    expect(result.declarant?.veutGarderAnonymat).toBeNull();
  });

  it('should create declarant from plaignant_anonyme alone even if plaignant is null', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant: null, plaignant_anonyme: 1 },
    });

    expect(result.declarant).not.toBeNull();
  });

  it('should add statut and detail lines to declarant.commentaire when plaignant_type=22', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: {
        ...sirecData.reclamation,
        plaignant_type: 22,
        preciser_statut: 'Précision statut',
        plaignant_rs: 'Ma société',
        nom_representant: 'Dupont',
        prenom_representant: 'Jean',
      },
    });

    expect(result.declarant?.commentaire).toBe(
      'Statut : Personne moral\nPrécisions : Précision statut\nRaison sociale : Ma société\nNom du représentant des requérants : Dupont\nPrénom du représentant des requérants : Jean',
    );
  });

  it('should add statut and detail lines to declarant.commentaire when plaignant_type=106', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_type: 106, plaignant_rs: 'Asso' },
    });

    expect(result.declarant?.commentaire).toContain('Statut : Autre');
    expect(result.declarant?.commentaire).toContain('Raison sociale : Asso');
  });

  it('should skip null detail fields in declarant.commentaire for plaignant_type=22', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_type: 22 },
    });

    expect(result.declarant?.commentaire).toBe('Statut : Personne moral');
  });

  it('should create declarant from plaignant_type=22 alone', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_type: 22 },
    });

    expect(result.declarant).not.toBeNull();
  });

  it('should ignore plaignant_type when value is not 22 or 106', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, plaignant_type: 24, plaignant_rs: 'Ignoré' },
    });

    expect(result.declarant).toBeNull();
  });

  it('should ignore plaignant_type when null', () => {
    const result = transformSirecReclamation(sirecData);

    expect(result.declarant).toBeNull();
  });
});
