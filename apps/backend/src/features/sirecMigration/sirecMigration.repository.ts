import type { RowDataPacket } from 'mysql2';
import { mysqlPool } from '../../config/mysql.js';

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
}

export interface SirecProvenance {
  id_provenance: number;
  id_group: number;
  date_signalement: Date | null;
  reponse_attendue: number | null;
}

export interface SirecReclamationData {
  reclamation: SirecReclamationRow;
  motifsDeclaresIdDicos: number[];
  groupIds: number[];
  provenances: SirecProvenance[];
}

export async function fetchSirecReclamationById(sirecId: number): Promise<SirecReclamationRow | null> {
  const [rows] = await mysqlPool.query<(SirecReclamationRow & RowDataPacket)[]>(
    'SELECT id_data, r_recept_date, description, reception, prioritaire, prioritaire_precisez, dest, dest_primaire, dest_secondaire, saisine, courrier_signal, plaignant, plaignant_anonyme, plaignant_est_anonyme, plaignant_type, plaignant_adresse, plaignant_adresse_complement, requerant_adresse, requerant_adresse_complete, requerant_cp, requerant_ville, preciser_statut, plaignant_rs, nom_representant, prenom_representant, plaignant_nom, plaignant_prenom, plaignant_mail, plaignant_tel, plaignant_connu, victime_lien_plaignant, lien_plai_autre, victime_non_identifiee, victime_age, victime_sexe, victime_adresse, victime_adresse_complement, usager_adresse, usager_adresse_complete, usager_cp, usager_ville, victime_nom, victime_prenom, victime_mail, victime_tel, service_recepteur_niv1, service_gestionnaire, accuser_reception, date_envoi_ar, accuser_reception_precision FROM sire_reclamation_data WHERE id_data = ?',
    [sirecId],
  );
  return rows[0] ?? null;
}

export async function fetchSirecMotifsDeclaresById(sirecId: number): Promise<number[]> {
  const [rows] = await mysqlPool.query<({ id_dico: number } & RowDataPacket)[]>(
    'SELECT id_dico FROM sire_reclamation_dico_motifs_declares_data WHERE id_reclamation = ?',
    [sirecId],
  );
  return rows.map((row) => row.id_dico);
}

export async function fetchSirecGroupIds(sirecId: number): Promise<number[]> {
  const [rows] = await mysqlPool.query<({ id_group: number } & RowDataPacket)[]>(
    'SELECT id_group FROM sire_reclamation_data_group WHERE id_data = ? AND id_group != 1',
    [sirecId],
  );
  return rows.map((row) => row.id_group);
}

export async function fetchSirecProvenances(sirecId: number): Promise<SirecProvenance[]> {
  const [rows] = await mysqlPool.query<(SirecProvenance & RowDataPacket)[]>(
    `SELECT p.id_provenance, pg.id_group, p.date_signalement, p.reponse_attendue
     FROM sire_provenances_data p
     INNER JOIN sire_provenances_data_group pg ON pg.id_data = p.id_data
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

export async function fetchSirecData(sirecId: number): Promise<SirecReclamationData | null> {
  const reclamation = await fetchSirecReclamationById(sirecId);
  if (!reclamation) return null;

  const [motifsDeclaresIdDicos, groupIds, provenances] = await Promise.all([
    fetchSirecMotifsDeclaresById(sirecId),
    fetchSirecGroupIds(sirecId),
    fetchSirecProvenances(sirecId),
  ]);

  return { reclamation, motifsDeclaresIdDicos, groupIds, provenances };
}
