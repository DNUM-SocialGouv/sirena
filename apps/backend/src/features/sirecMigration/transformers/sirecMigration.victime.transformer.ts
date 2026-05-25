import type { SirecReclamationRow } from '../sirecMigration.repository.js';
import { transcodeVictimeAge } from '../transco/victimeAge.transco.js';
import { transcodeVictimeSexe } from '../transco/victimeSexe.transco.js';
import type { SirenaAdresseData, SirenaIdentiteData } from './sirecMigration.declarant.transformer.js';

export interface SirenaVictimeData {
  identite: SirenaIdentiteData | null;
  adresse: SirenaAdresseData | null;
  commentaire: string;
  ageId: string | null;
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

function transformVictimeAdresse(reclamation: SirecReclamationRow): SirenaAdresseData | null {
  const { victime_adresse, victime_adresse_complement, usager_adresse, usager_cp, usager_ville } = reclamation;
  const rue = [victime_adresse, victime_adresse_complement, usager_adresse].filter(Boolean).join(' ') || null;
  return rue || usager_cp || usager_ville ? { rue, codePostal: usager_cp, ville: usager_ville } : null;
}

export function transformSirecVictime(reclamation: SirecReclamationRow): SirenaVictimeData | null {
  const { victime_non_identifiee, victime_age } = reclamation;

  const identite = transformVictimeIdentite(reclamation);
  const adresse = transformVictimeAdresse(reclamation);
  const ageId = transcodeVictimeAge(victime_age);

  const victimeCommentaireParts = [
    victime_non_identifiee === 1 ? 'Usager (Victime) non identifié : oui' : null,
    victime_age !== null && victime_age >= 0 ? `Age de la victime : ${victime_age}` : null,
  ].filter(Boolean) as string[];

  const commentaire = victimeCommentaireParts.join('\n');
  const hasVictimeData = identite !== null || adresse !== null || commentaire !== '' || ageId !== null;

  return hasVictimeData ? { identite, adresse, commentaire, ageId } : null;
}
