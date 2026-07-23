import { mariadbPool } from '../../config/mariadb.js';
import { SIREC_NATIONAL_ENTITE_ID } from './transco/affectation/affectation.transco.js';
import { MOTIF_IGAS_A_RENSEIGNER, MOTIF_IGAS_HORS_COMPETENCE } from './transco/motifsIgas.transco.js';

export interface SirecReclamationRow {
  id_data: number;
  r_recept_date: Date | null;
  description: string | null;
  reception: number | null;
  prioritaire: number | null;
  prioritaire_precisez: string | null;
  dest: number | null;
  dest_primaire: string | null;
  dest_secondaire: string | null;
  saisine: number | null;
  courrier_signal: number | null;
  plaignant: number | null;
  plaignant_anonyme: number | null;
  plaignant_est_anonyme: number | null;
  plaignant_type: number | null;
  plaignant_adresse: string | null;
  plaignant_adresse_complement: string | null;
  requerant_adresse: string | null;
  requerant_adresse_complete: string | null;
  requerant_cp: string | null;
  requerant_ville: string | null;
  preciser_statut: string | null;
  plaignant_rs: string | null;
  nom_representant: string | null;
  prenom_representant: string | null;
  plaignant_nom: string | null;
  plaignant_prenom: string | null;
  plaignant_mail: string | null;
  plaignant_tel: string | null;
  plaignant_connu: number | null;
  victime_lien_plaignant: number | null;
  lien_plai_autre: string | null;
  victime_non_identifiee: number | null;
  victime_age: number | null;
  victime_sexe: number | null;
  victime_adresse: string | null;
  victime_adresse_complement: string | null;
  usager_adresse: string | null;
  usager_adresse_complete: string | null;
  usager_cp: string | null;
  usager_ville: string | null;
  victime_nom: string | null;
  victime_prenom: string | null;
  victime_mail: string | null;
  victime_tel: string | null;
  service_recepteur_niv1: number | null;
  service_gestionnaire: number | null;
  accuser_reception: number | null;
  date_envoi_ar: Date | null;
  accuser_reception_precision: string | null;
  institution_part: string | null;
  niv_competence_reclam: number | null;
  date_transfert_instit1: Date | null;
  date_transfert_instit2: Date | null;
  date_transfert_instit3: Date | null;
  prec_niv_comp: string | null;
  date_traitement: Date | null;
  type_traitement_prec: string | null;
  date_commission: Date | null;
  date_rep_provenance1: Date | null;
  date_rep_provenance2: Date | null;
  date_rep_provenance3: Date | null;
  reponse_plaignant: number | null;
  date_rep_plaignant: Date | null;
  reponse_plaignant_precision: string | null;
  sans_mc: number | null;
  observation: string | null;
  mesures_prises: number | null;
  mesures_initiative: number | null;
  mesures_precision: string | null;
  sys_last_mod_date: Date;
  sys_creation_date: Date;
  type_cloture: number | null;
  motif_cloture: string | null;
  date_cloture: Date | null;
  date_ecriture: Date | null;
  domaine: number | null;
  mandataire_judiciaire: number | null;
  mandataire_precisez: number | null;
  ei_avere: number | null;
  num_sign_assoc: string | null;
  date_recep_gest: Date | null;
  signalement: number | null;
  departement: number | null;
}

export interface SirecProvenance {
  id_provenance: number;
  id_group: number;
  date_signalement: Date | null;
  reponse_attendue: number | null;
}

export interface SirecRppsData {
  id_data: number;
  rpps: string | null;
  civilite: string | null;
  nom: string | null;
  prenom: string | null;
  code_postal: string | null;
  commune: string | null;
  libelle_prof: string | null;
}

export interface SirecFinessData {
  id_data: number;
  nofinesset: string | null;
  categetab: string | null;
  libcategetab: string | null;
  rs: string | null;
  codepostal: string | null;
  libcommune: string | null;
  numvoie: number | null;
  typevoie: string | null;
  voie: string | null;
}

export interface SirecMcIgasMotif {
  id_igas: number;
  igas_type: 'in' | 'out';
}

export interface SirecMisEnCause {
  id_data: number;
  type: number | null;
  identifiant: number | null;
  autresMcType: number | null;
  label: string | null;
  adresse: string | null;
  serviceConcerne: number | null;
  publicConcerne: number | null;
  groupIds: number[];
  rppsData: SirecRppsData | null;
  finessData: SirecFinessData | null;
  motifsIgas: SirecMcIgasMotif[];
}

export interface SirecMainCourante {
  id_data: number;
  type_action1: number | null;
  commentaire: string | null;
  date_action: Date | null;
  sys_creation_date: Date;
  groupIds: number[];
}

export interface SirecReclamationData {
  reclamation: SirecReclamationRow;
  motifsDeclaresIdDicos: number[];
  groupIds: number[];
  provenances: SirecProvenance[];
  institutionPartenaires: Record<number, string>;
  typeTraitementIdDicos: number[];
  misEnCauses: SirecMisEnCause[];
  mainCourantes: SirecMainCourante[];
}

export async function fetchExistingSirecIds(sirecIds: number[]): Promise<number[]> {
  if (sirecIds.length === 0) return [];
  const rows = await mariadbPool.query<{ id_data: number }[]>(
    'SELECT id_data FROM sire_reclamation_data WHERE id_data IN (?)',
    [sirecIds],
  );
  return rows.map((row) => row.id_data);
}

export async function fetchSirecIdsByServiceIds(serviceIds: number[]): Promise<number[]> {
  if (serviceIds.length === 0) return [];
  const rows = await mariadbPool.query<{ id_data: number }[]>(
    `SELECT DISTINCT r.id_data
     FROM sire_reclamation_data r
     INNER JOIN sire_reclamation_data_group rg ON r.id_data = rg.id_data
     WHERE rg.id_group IN (?)`,
    [serviceIds],
  );
  return rows.map((row) => row.id_data);
}

export async function fetchSirecReclamationById(sirecId: number): Promise<SirecReclamationRow | null> {
  const rows = await mariadbPool.query<SirecReclamationRow[]>(
    'SELECT id_data, r_recept_date, description, reception, prioritaire, prioritaire_precisez, dest, dest_primaire, dest_secondaire, saisine, courrier_signal, plaignant, plaignant_anonyme, plaignant_est_anonyme, plaignant_type, plaignant_adresse, plaignant_adresse_complement, requerant_adresse, requerant_adresse_complete, requerant_cp, requerant_ville, preciser_statut, plaignant_rs, nom_representant, prenom_representant, plaignant_nom, plaignant_prenom, plaignant_mail, plaignant_tel, plaignant_connu, victime_lien_plaignant, lien_plai_autre, victime_non_identifiee, victime_age, victime_sexe, victime_adresse, victime_adresse_complement, usager_adresse, usager_adresse_complete, usager_cp, usager_ville, victime_nom, victime_prenom, victime_mail, victime_tel, service_recepteur_niv1, service_gestionnaire, accuser_reception, date_envoi_ar, accuser_reception_precision, institution_part, niv_competence_reclam, date_transfert_instit1, date_transfert_instit2, date_transfert_instit3, prec_niv_comp, date_traitement, type_traitement_prec, date_commission, date_rep_provenance1, date_rep_provenance2, date_rep_provenance3, reponse_plaignant, date_rep_plaignant, reponse_plaignant_precision, sans_mc, observation, mesures_prises, mesures_initiative, mesures_precision, sys_last_mod_date, sys_creation_date, type_cloture, motif_cloture, date_cloture, date_ecriture, domaine, mandataire_judiciaire, mandataire_precisez, ei_avere, num_sign_assoc, date_recep_gest, signalement, departement FROM sire_reclamation_data WHERE id_data = ?',
    [sirecId],
  );

  return rows[0] ?? null;
}

export async function fetchSirecMotifsDeclaresById(sirecId: number): Promise<number[]> {
  const rows = await mariadbPool.query<{ id_dico: number }[]>(
    'SELECT id_dico FROM sire_reclamation_dico_motifs_declares_data WHERE id_reclamation = ?',
    [sirecId],
  );
  return rows.map((row) => row.id_dico);
}

export async function fetchSirecGroupIds(sirecId: number): Promise<number[]> {
  const rows = await mariadbPool.query<{ id_group: number }[]>(
    `SELECT id_group
     FROM sire_reclamation_data_group
     WHERE id_data = ?
       AND id_group != ${SIREC_NATIONAL_ENTITE_ID}
       and id_group != 3`,
    [sirecId],
  );
  return rows.map((row) => row.id_group);
}

export async function fetchSirecProvenances(sirecId: number): Promise<SirecProvenance[]> {
  const rows = await mariadbPool.query<SirecProvenance[]>(
    `SELECT p.id_provenance, pg.id_group, p.date_signalement, p.reponse_attendue
     FROM sire_provenances_data p
              INNER JOIN sire_provenances_data_group pg
                         ON pg.id_data = p.id_data and pg.id_group != ${SIREC_NATIONAL_ENTITE_ID} and pg.id_group != 3
     WHERE p.id_reclamation = ?`,
    [sirecId],
  );
  return rows.map((row) => ({
    id_provenance: row.id_provenance,
    id_group: row.id_group,
    date_signalement: row.date_signalement,
    reponse_attendue: row.reponse_attendue,
  }));
}

export async function fetchSirecInstitutionPartenaires(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const rows = await mariadbPool.query<{ id_data: number; institution: string }[]>(
    'SELECT id_data, institution FROM sire_institution_data WHERE id_data IN (?)',
    [ids],
  );
  return Object.fromEntries(rows.map((row) => [row.id_data, row.institution]));
}

export async function fetchSirecTypeTraitementIds(sirecId: number): Promise<number[]> {
  const rows = await mariadbPool.query<{ id_dico: number }[]>(
    'SELECT id_dico FROM sire_reclamation_dico_type_traitement_data WHERE id_reclamation = ?',
    [sirecId],
  );
  return rows.map((row) => row.id_dico);
}

type MisEnCauseRow = {
  id_data: number;
  type: number | null;
  identifiant: number | null;
  autres_mc_type: number | null;
  label: string | null;
  adresse: string | null;
  service_concerne: number | null;
  public_concerne: number | null;
  id_group: number | null;
  rpps_id_data: number | null;
  rpps_rpps: string | null;
  rpps_civilite: string | null;
  rpps_nom: string | null;
  rpps_prenom: string | null;
  rpps_code_postal: string | null;
  rpps_commune: string | null;
  rpps_libelle_prof: string | null;
  finess_id_data: number | null;
  finess_nofinesset: string | null;
  finess_categetab: string | null;
  finess_libcategetab: string | null;
  finess_rs: string | null;
  finess_codepostal: string | null;
  finess_libcommune: string | null;
  finess_numvoie: number | null;
  finess_typevoie: string | null;
  finess_voie: string | null;
};

type McIgasRow = {
  id_mc: number;
  id_igas: number;
  igas_type: 'in' | 'out';
};

export async function fetchSirecMcIgasMotifs(sirecId: number): Promise<Map<number, SirecMcIgasMotif[]>> {
  const rows = await mariadbPool.query<McIgasRow[]>(
    `SELECT i.id_mc, i.id_igas, i.igas_type
     FROM sire_mc_igas_data i
              INNER JOIN sire_misencause_data m ON m.id_data = i.id_mc
     WHERE m.id_reclamation = ?
       and i.id_igas NOT IN  (${MOTIF_IGAS_A_RENSEIGNER}, ${MOTIF_IGAS_HORS_COMPETENCE})`,
    [sirecId],
  );

  const map = new Map<number, SirecMcIgasMotif[]>();
  for (const row of rows) {
    const list = map.get(row.id_mc) ?? [];
    list.push({ id_igas: row.id_igas, igas_type: row.igas_type });
    map.set(row.id_mc, list);
  }
  return map;
}

export async function fetchSirecMisEnCauses(sirecId: number): Promise<SirecMisEnCause[]> {
  const [rows, motifsIgasByMc] = await Promise.all([
    mariadbPool.query<MisEnCauseRow[]>(
      `SELECT m.id_data,
            m.type,
            m.identifiant,
            m.autres_mc_type,
            m.label,
            m.adresse,
            m.service_concerne,
            m.public_concerne,
            mcg.id_group,
            r.id_data      AS rpps_id_data,
            r.rpps         AS rpps_rpps,
            r.civilite     AS rpps_civilite,
            r.nom          AS rpps_nom,
            r.prenom       AS rpps_prenom,
            r.code_postal  AS rpps_code_postal,
            r.commune      AS rpps_commune,
            r.libelle_prof AS rpps_libelle_prof,
            f.id_data      AS finess_id_data,
            f.nofinesset   AS finess_nofinesset,
            f.categetab AS finess_categetab,
            f.libcategetab AS finess_libcategetab,
            f.rs           AS finess_rs,
            f.codepostal   AS finess_codepostal,
            f.libcommune   AS finess_libcommune,
            f.numvoie      AS finess_numvoie,
            f.typevoie     AS finess_typevoie,
            f.voie         AS finess_voie
     FROM sire_misencause_data m
              LEFT JOIN sire_misencause_data_group mcg
                        ON m.id_data = mcg.id_data AND mcg.id_group != ${SIREC_NATIONAL_ENTITE_ID} AND
                           mcg.id_group != 3 AND mcg.id_group != 0
              LEFT JOIN sire_rpps_data r ON r.id_data = m.identifiant AND m.type = 65
              LEFT JOIN sire_finess_data f ON f.id_data = m.identifiant AND m.type = 64
     WHERE m.id_reclamation = ?
       and m.identifiant != 0`,
      [sirecId],
    ),
    fetchSirecMcIgasMotifs(sirecId),
  ]);

  const map = new Map<number, SirecMisEnCause>();
  for (const row of rows) {
    if (!map.has(row.id_data)) {
      const rppsData: SirecRppsData | null =
        row.rpps_id_data !== null
          ? {
              id_data: row.rpps_id_data,
              rpps: row.rpps_rpps,
              civilite: row.rpps_civilite,
              nom: row.rpps_nom,
              prenom: row.rpps_prenom,
              code_postal: row.rpps_code_postal,
              commune: row.rpps_commune,
              libelle_prof: row.rpps_libelle_prof,
            }
          : null;
      const finessData: SirecFinessData | null =
        row.finess_id_data !== null
          ? {
              id_data: row.finess_id_data,
              nofinesset: row.finess_nofinesset,
              categetab: row.finess_categetab,
              libcategetab: row.finess_libcategetab,
              rs: row.finess_rs,
              codepostal: row.finess_codepostal,
              libcommune: row.finess_libcommune,
              numvoie: row.finess_numvoie,
              typevoie: row.finess_typevoie,
              voie: row.finess_voie,
            }
          : null;
      map.set(row.id_data, {
        id_data: row.id_data,
        type: row.type,
        identifiant: row.identifiant,
        autresMcType: row.autres_mc_type,
        label: row.label,
        adresse: row.adresse,
        serviceConcerne: row.service_concerne,
        publicConcerne: row.public_concerne,
        groupIds: [],
        rppsData,
        finessData,
        motifsIgas: motifsIgasByMc.get(row.id_data) ?? [],
      });
    }
    if (row.id_group !== null) {
      // biome-ignore lint/style/noNonNullAssertion: key was just set above
      map.get(row.id_data)!.groupIds.push(row.id_group);
    }
  }
  return [...map.values()];
}

type MainCouranteRow = {
  id_data: number;
  type_action1: number | null;
  commentaire: string | null;
  date_action: Date | null;
  sys_creation_date: Date;
  id_group: number | null;
};

export async function fetchSirecMainCourantes(sirecId: number): Promise<SirecMainCourante[]> {
  const rows = await mariadbPool.query<MainCouranteRow[]>(
    `SELECT mc.id_data, mc.type_action1, mc.commentaire, mc.date_action, mc.sys_creation_date, dg.id_group
     FROM sire_main_courante_data mc
              LEFT JOIN sire_main_courante_data_group dg
                        ON mc.id_data = dg.id_data AND dg.id_group != ${SIREC_NATIONAL_ENTITE_ID} and dg.id_group != 3
     WHERE mc.id_reclamation = ?`,
    [sirecId],
  );

  const map = new Map<number, SirecMainCourante>();
  for (const row of rows) {
    if (!map.has(row.id_data)) {
      map.set(row.id_data, {
        id_data: row.id_data,
        type_action1: row.type_action1,
        commentaire: row.commentaire,
        date_action: row.date_action,
        sys_creation_date: row.sys_creation_date,
        groupIds: [],
      });
    }
    if (row.id_group !== null) {
      // biome-ignore lint/style/noNonNullAssertion: key was just set above
      map.get(row.id_data)!.groupIds.push(row.id_group);
    }
  }
  return [...map.values()];
}

function parseInstitutionPartNumericIds(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .map(Number);
}

export async function fetchSirecData(sirecId: number): Promise<SirecReclamationData | null> {
  const reclamation = await fetchSirecReclamationById(sirecId);
  if (!reclamation) return null;

  const institutionIds = parseInstitutionPartNumericIds(reclamation.institution_part);

  const [
    motifsDeclaresIdDicos,
    groupIds,
    provenances,
    institutionPartenaires,
    typeTraitementIdDicos,
    misEnCauses,
    mainCourantes,
  ] = await Promise.all([
    fetchSirecMotifsDeclaresById(sirecId),
    fetchSirecGroupIds(sirecId),
    fetchSirecProvenances(sirecId),
    fetchSirecInstitutionPartenaires(institutionIds),
    fetchSirecTypeTraitementIds(sirecId),
    fetchSirecMisEnCauses(sirecId),
    fetchSirecMainCourantes(sirecId),
  ]);

  return {
    reclamation,
    motifsDeclaresIdDicos,
    groupIds,
    provenances,
    institutionPartenaires,
    typeTraitementIdDicos,
    misEnCauses,
    mainCourantes,
  };
}
