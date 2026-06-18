import { describe, expect, it, vi } from 'vitest';
import { transformSirecReclamation } from './sirecMigration.transformer.js';

vi.mock('../transco/affectation/affectation.transco.js', () => ({
  transcodeAffectation: vi.fn((id: number) => {
    const ARS: Record<number, string> = {
      667: '4988789e-9775-4958-861f-52f03cbc9257',
      677: '359e7f37-7344-4680-8b78-3101a01b073c',
      693: '4af829ff-07c1-425d-85d6-83b5f97e4422',
    };
    const arsId = ARS[id];
    if (arsId) return { requeteEntiteIds: [arsId], situationEntiteIds: [] };
    return {
      requeteEntiteIds: ['4af829ff-07c1-425d-85d6-83b5f97e4422'],
      situationEntiteIds: [`service-${id}`, '4af829ff-07c1-425d-85d6-83b5f97e4422'],
    };
  }),
  filterArsEntiteIds: vi.fn((ids: string[]) => {
    const ARS_IDS = new Set([
      '4988789e-9775-4958-861f-52f03cbc9257',
      '359e7f37-7344-4680-8b78-3101a01b073c',
      '4af829ff-07c1-425d-85d6-83b5f97e4422',
    ]);
    return ids.filter((id) => ARS_IDS.has(id));
  }),
  initAffectationTransco: vi.fn(),
}));

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
      dest_primaire: null as string | null,
      dest_secondaire: null as string | null,
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
      institution_part: null as string | null,
      niv_competence_reclam: null as number | null,
      date_transfert_instit1: null as Date | null,
      date_transfert_instit2: null as Date | null,
      date_transfert_instit3: null as Date | null,
      prec_niv_comp: null as string | null,
      date_traitement: null as Date | null,
      type_traitement_prec: null as string | null,
      date_commission: null as Date | null,
      date_rep_provenance1: null as Date | null,
      date_rep_provenance2: null as Date | null,
      date_rep_provenance3: null as Date | null,
      reponse_plaignant: null as number | null,
      date_rep_plaignant: null as Date | null,
      reponse_plaignant_precision: null as string | null,
      sans_mc: null as number | null,
      observation: null as string | null,
      mesures_prises: null as number | null,
      mesures_initiative: null as number | null,
      mesures_precision: null as string | null,
      sys_last_mod_date: null as Date | null,
      type_cloture: null as number | null,
      motif_cloture: null as string | null,
      date_cloture: null as Date | null,
      date_ecriture: null as Date | null,
    },
    motifsDeclaresIdDicos: [809],
    groupIds: [],
    provenances: [],
    institutionPartenaires: {} as Record<number, string>,
    typeTraitementIdDicos: [] as number[],
    mainCourantes: [],
    misEnCauses: [],
  };

  it('should map all fields correctly', () => {
    const result = transformSirecReclamation(sirecData);

    expect(result).toEqual({
      sirenaId: 'SIREC-42',
      sirecId: 42,
      receptionDate: new Date('2024-01-15'),
      receptionTypeId: 'EMAIL',
      prioriteId: 'HAUTE',
      requeteStatutId: 'EN_COURS',
      sysLastModDate: null,
      dateDemandeDeclarant: null,
      declarant: null,
      victime: null,
      requeteEntiteIds: ['4af829ff-07c1-425d-85d6-83b5f97e4422'],
      etapes: [],
      situations: [
        {
          fait: {
            commentaire: 'Précision prioritaire',
            autresPrecisions: 'Ma réclamation',
            motifsDeclaratifs: ['PROBLEME_FACTURATION'],
          },
          entiteIds: [],
          demarchesIds: [],
          misEnCauseData: null,
          lieuDeSurvenueData: null,
        },
      ],
    });
  });

  it('should map service_recepteur_niv1 to requeteEntiteIds via affectation transco', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, service_recepteur_niv1: 1115, service_gestionnaire: null },
    });

    expect(result.requeteEntiteIds).toEqual(['4af829ff-07c1-425d-85d6-83b5f97e4422']);
    expect(result.situations[0].entiteIds).toContain('service-1115');
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

  it('should map sys_last_mod_date to sysLastModDate', () => {
    const date = new Date('2024-03-20');
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, sys_last_mod_date: date },
    });

    expect(result.sysLastModDate).toEqual(date);
  });

  it('should map date_ecriture to dateDemandeDeclarant', () => {
    const date = new Date('2023-11-07');
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, date_ecriture: date },
    });

    expect(result.dateDemandeDeclarant).toEqual(date);
  });

  it('should map null date_ecriture to null dateDemandeDeclarant', () => {
    const result = transformSirecReclamation({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, date_ecriture: null },
    });

    expect(result.dateDemandeDeclarant).toBeNull();
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

  describe('etapes (provenances)', () => {
    it('should return an empty etapes array when there are no provenances', () => {
      const result = transformSirecReclamation(sirecData);

      expect(result.etapes).toEqual([]);
    });

    it('should map a provenance to an etape with the institution name in nom', () => {
      // service_recepteur_niv1: 693 → ARS Normandie (4af829ff-...)
      // provenance id_group: 693 → same ARS Normandie
      const result = transformSirecReclamation({
        ...sirecData,
        provenances: [{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }],
      });

      expect(result.etapes[0].nom).toBe("Réception à l'institution de provenance : Institution 1");
      expect(result.etapes[0].entiteId).toBe('4af829ff-07c1-425d-85d6-83b5f97e4422');
    });
  });

  describe('etapes (institutionsPartenaires)', () => {
    it('should add no etape when institution_part is null', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, institution_part: null, niv_competence_reclam: 54 },
      });

      expect(result.etapes).toEqual([]);
    });

    it('should add no etape when niv_competence_reclam is null', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, institution_part: '1', niv_competence_reclam: null },
        institutionPartenaires: { 1: 'CHU de Rouen' },
      });

      expect(result.etapes).toEqual([]);
    });

    it('should create one etape per institution using the ARS entiteId', () => {
      // service_recepteur_niv1: 693 → ARS Normandie (4af829ff-...)
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, institution_part: '1,2', niv_competence_reclam: 54 },
        institutionPartenaires: { 1: 'Institution A', 2: 'Institution B' },
      });

      expect(result.etapes).toHaveLength(2);
      expect(result.etapes[0].entiteId).toBe('4af829ff-07c1-425d-85d6-83b5f97e4422');
      expect(result.etapes[0].nom).toBe("Transfert à l'institution : Institution A");
      expect(result.etapes[1].nom).toBe("Transfert à l'institution : Institution B");
    });

    it('should create etapes with "Réponse hors compétence" prefix when niv_competence_reclam is 52', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, institution_part: '1', niv_competence_reclam: 52 },
        institutionPartenaires: { 1: 'CPAM' },
      });

      expect(result.etapes[0].nom).toBe("Réponse hors compétence à l'institution : CPAM");
    });
  });

  describe('etapes (accuseReception)', () => {
    it('should add no etape when accuser_reception is null', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, accuser_reception: null },
      });

      expect(result.etapes).toEqual([]);
    });

    it('should add one etape per ARS entiteId when accuser_reception is false', () => {
      // service_recepteur_niv1: 693 → ARS Normandie (1 ARS entiteId)
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, accuser_reception: 111 },
      });

      expect(result.etapes).toHaveLength(1);
      expect(result.etapes[0].statutId).toBe('FAIT');
      expect(result.etapes[0].note).toBe("Envoi d'un accusé de réception : non");
    });

    it('should add etape with statut FAIT and createdAt when accuser_reception is true and date is set', () => {
      const date = new Date('2024-06-10');
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, accuser_reception: 1, date_envoi_ar: date },
      });

      expect(result.etapes[0].statutId).toBe('FAIT');
      expect(result.etapes[0].createdAt).toEqual(date);
      expect(result.etapes[0].note).toContain("Date d'envoi de l'accusé de réception au requérant");
    });

    it('should add etape with statut A_FAIRE when accuser_reception is true and date is null', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, accuser_reception: 1, date_envoi_ar: null },
      });

      expect(result.etapes[0].statutId).toBe('A_FAIRE');
    });
  });

  describe('etapes (priseEnCharge)', () => {
    it('should add no etape when all prise en charge fields are absent', () => {
      const result = transformSirecReclamation(sirecData);

      expect(result.etapes).toEqual([]);
    });

    it('should add one etape per ARS entiteId when date_traitement is set', () => {
      // service_recepteur_niv1: 693 → ARS Normandie (1 ARS entiteId)
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, date_traitement: new Date('2024-06-01') },
      });

      expect(result.etapes).toHaveLength(1);
      expect(result.etapes[0].nom).toBe('Prise en charge de la requête');
      expect(result.etapes[0].statutId).toBe('FAIT');
    });

    it('should add one etape when typeTraitementIdDicos is non-empty', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        typeTraitementIdDicos: [344],
      });

      expect(result.etapes).toHaveLength(1);
      expect(result.etapes[0].note).toContain('Type(s) de traitement');
    });

    it('should add one etape when type_traitement_prec is set', () => {
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, type_traitement_prec: 'Précision quelconque' },
      });

      expect(result.etapes).toHaveLength(1);
      expect(result.etapes[0].note).toContain('Précisions : Précision quelconque');
    });
  });

  describe('etapes (examenCommission)', () => {
    it('should add no etape when date_commission is null', () => {
      const result = transformSirecReclamation(sirecData);

      expect(result.etapes).toEqual([]);
    });

    it('should add one etape per ARS entiteId when date_commission is set', () => {
      // service_recepteur_niv1: 693 → ARS Normandie (1 ARS entiteId)
      const date = new Date('2024-09-05');
      const result = transformSirecReclamation({
        ...sirecData,
        reclamation: { ...sirecData.reclamation, date_commission: date },
      });

      expect(result.etapes).toHaveLength(1);
      expect(result.etapes[0].nom).toBe('Examen en commission');
      expect(result.etapes[0].createdAt).toEqual(date);
      expect(result.etapes[0].note).toBe("Date d'examen en commission : 05/09/2024");
    });
  });
});
