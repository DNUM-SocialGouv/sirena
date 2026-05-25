import type { SirecReclamationRow } from '../sirecMigration.repository.js';
import { transcodeVictimeSexe } from '../transco/victimeSexe.transco.js';
import type { SirenaIdentiteData } from './sirecMigration.identite.transformer.js';

export interface SirenaVictimeData {
  identite: SirenaIdentiteData | null;
  commentaire: string;
}

function transformVictimeIdentite(reclamation: SirecReclamationRow): SirenaIdentiteData | null {
  const { victime_nom, victime_prenom, victime_mail, victime_tel, victime_sexe } = reclamation;
  const civiliteId = transcodeVictimeSexe(victime_sexe);
  if (
    victime_nom === null &&
    victime_prenom === null &&
    victime_mail === null &&
    victime_tel === null &&
    civiliteId === null
  ) {
    return null;
  }
  return { nom: victime_nom, prenom: victime_prenom, email: victime_mail, telephone: victime_tel, civiliteId };
}

export function transformSirecVictime(reclamation: SirecReclamationRow): SirenaVictimeData | null {
  const { victime_non_identifiee } = reclamation;

  const identite = transformVictimeIdentite(reclamation);

  const victimeCommentaireParts = [victime_non_identifiee === 1 ? 'Usager (Victime) non identifié : oui' : null].filter(
    Boolean,
  ) as string[];

  const commentaire = victimeCommentaireParts.join('\n');
  const hasVictimeData = identite !== null || commentaire !== '';

  return hasVictimeData ? { identite, commentaire } : null;
}
