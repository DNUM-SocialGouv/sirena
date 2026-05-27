import { describe, expect, it } from 'vitest';
import { SirecDataError } from '../transco/sirecTransco.error.js';
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
      requerant_adresse_complete: null as string | null,
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
      plaignant_connu: null as number | null,
      victime_lien_plaignant: null as number | null,
      lien_plai_autre: null as string | null,
      victime_non_identifiee: null as number | null,
      victime_age: null as number | null,
      victime_sexe: null as number | null,
      victime_adresse: null as string | null,
      victime_adresse_complement: null as string | null,
      usager_adresse: null as string | null,
      usager_adresse_complete: null as string | null,
      usager_cp: null as string | null,
      usager_ville: null as string | null,
      victime_nom: null as string | null,
      victime_prenom: null as string | null,
      victime_mail: null as string | null,
      victime_tel: null as string | null,
      service_recepteur_niv1: 693,
      service_gestionnaire: null,
      accuser_reception: null as number | null,
      date_envoi_ar: null as Date | null,
      accuser_reception_precision: null as string | null,
    },
    motifsDeclaresIdDicos: [809],
    groupIds: [],
    provenances: [],
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
      victime: null,
      requeteEntiteIds: ['4af829ff-07c1-425d-85d6-83b5f97e4422'],
      provenances: [],
      accuseReceptionEtapes: [],
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

  it('should create victime from transformSirecVictime when victime_non_identifiee=1', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, victime_non_identifiee: 1 },
    });

    expect(result.victime).not.toBeNull();
  });

  it('should leave victime null when no victime data and declarant is not the victim', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, victime_non_identifiee: null },
    });

    expect(result.victime).toBeNull();
  });

  describe('provenances', () => {
    it('should return an empty provenances array when there are no provenances', () => {
      const result = transformSirecReclamation(sirecData);

      expect(result.provenances).toEqual([]);
    });

    it('should map a provenance whose entiteId matches requeteEntiteIds', () => {
      // service_recepteur_niv1: 693 → ARS Normandie (4af829ff-...)
      // provenance id_group: 693 → same ARS Normandie
      const result = transformSirecReclamation({
        ...sirecData,
        provenances: [{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }],
      });

      expect(result.provenances[0].nom).toBe('Institution 1');
      expect(result.provenances[0].entiteId).toBe('4af829ff-07c1-425d-85d6-83b5f97e4422');
    });

    it('should throw SirecDataError when provenance entiteId is not in requeteEntiteIds', () => {
      // service_recepteur_niv1: 693 → ARS Normandie, provenance id_group: 677 → ARS Grand Est (mismatch)
      expect(() =>
        transformSirecReclamation({
          ...sirecData,
          provenances: [{ id_provenance: 103, id_group: 677, date_signalement: null, reponse_attendue: null }],
        }),
      ).toThrow(SirecDataError);
    });
  });

  describe('accuseReceptionEtapes', () => {
    it('should return empty accuseReceptionEtapes when accuser_reception is null', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, accuser_reception: null },
      });

      expect(result.accuseReceptionEtapes).toEqual([]);
    });

    it('should create one etape per ARS entiteId when accuser_reception is false', () => {
      // service_recepteur_niv1: 693 → ARS Normandie (1 ARS entiteId)
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, accuser_reception: 111 },
      });

      expect(result.accuseReceptionEtapes).toHaveLength(1);
      expect(result.accuseReceptionEtapes[0].statutId).toBe('FAIT');
      expect(result.accuseReceptionEtapes[0].note).toBe("Envoi d'un accusé de réception : non");
    });

    it('should create etape with statut FAIT and createdAt when accuser_reception is true and date is set', () => {
      const date = new Date('2024-06-10');
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, accuser_reception: 1, date_envoi_ar: date },
      });

      expect(result.accuseReceptionEtapes[0].statutId).toBe('FAIT');
      expect(result.accuseReceptionEtapes[0].createdAt).toEqual(date);
      expect(result.accuseReceptionEtapes[0].note).toContain("Date d'envoi de l'accusé de réception au requérant");
    });

    it('should create etape with statut A_FAIRE when accuser_reception is true and date is null', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, accuser_reception: 1, date_envoi_ar: null },
      });

      expect(result.accuseReceptionEtapes[0].statutId).toBe('A_FAIRE');
    });
  });
});
