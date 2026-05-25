import type { SirecReclamationRow } from '../sirecMigration.repository.js';

export interface SirenaIdentiteData {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  civiliteId: string | null;
}

export function transformSirecIdentite(reclamation: SirecReclamationRow): SirenaIdentiteData | null {
  const { plaignant_nom, plaignant_prenom, plaignant_mail, plaignant_tel } = reclamation;
  if (plaignant_nom === null && plaignant_prenom === null && plaignant_mail === null && plaignant_tel === null) {
    return null;
  }
  return {
    nom: plaignant_nom,
    prenom: plaignant_prenom,
    email: plaignant_mail,
    telephone: plaignant_tel,
    civiliteId: null,
  };
}
