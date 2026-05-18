import type { RowDataPacket } from 'mysql2';
import { mysqlPool } from '../../config/mysql.js';

export interface SirecReclamationRow {
  id_data: number;
  r_recept_date: Date | null;
  description: string | null;
  reception: number | null;
  prioritaire: number | null;
}

export interface SirecReclamationData {
  reclamation: SirecReclamationRow;
  motifsDeclaresIdDicos: number[];
}

export async function fetchSirecReclamationById(sirecId: number): Promise<SirecReclamationRow | null> {
  const [rows] = await mysqlPool.query<(SirecReclamationRow & RowDataPacket)[]>(
    'SELECT id_data, r_recept_date, description, reception, prioritaire FROM sire_reclamation_data WHERE id_data = ?',
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

export async function fetchSirecData(sirecId: number): Promise<SirecReclamationData | null> {
  const reclamation = await fetchSirecReclamationById(sirecId);
  if (!reclamation) return null;

  const motifsDeclaresIdDicos = await fetchSirecMotifsDeclaresById(sirecId);

  return { reclamation, motifsDeclaresIdDicos };
}
