import { MesureProtection } from '@sirena/db/generated-client';
import type { SirecReclamationRow } from '../sirecMigration.repository.js';
import { SIREC_BOOLEAN_TRANSCO, SIREC_DICO } from '../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
import { transcodeVictimeAge } from '../transco/victimeAge.transco.js';
import { transcodeVictimeSexe } from '../transco/victimeSexe.transco.js';
import type { SirenaAdresseData, SirenaIdentiteData } from './sirecMigration.declarant.transformer.js';

export interface SirenaVictimeData {
  identite: SirenaIdentiteData | null;
  adresse: SirenaAdresseData | null;
  commentaire: string;
  ageId: string | null;
  mesureProtection: MesureProtection | null;
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
  const {
    victime_adresse,
    victime_adresse_complement,
    usager_adresse,
    usager_adresse_complete,
    usager_cp,
    usager_ville,
  } = reclamation;
  const effectiveUsagerAdresse = usager_adresse || usager_adresse_complete;
  const rue = [victime_adresse, victime_adresse_complement, effectiveUsagerAdresse].filter(Boolean).join(' ') || null;
  return rue || usager_cp || usager_ville ? { rue, codePostal: usager_cp, ville: usager_ville } : null;
}

export function transformSirecVictime(reclamation: SirecReclamationRow): SirenaVictimeData | null {
  const { victime_non_identifiee, victime_age, mandataire_judiciaire, mandataire_precisez } = reclamation;

  const identite = transformVictimeIdentite(reclamation);
  const adresse = transformVictimeAdresse(reclamation);
  const ageId = transcodeVictimeAge(victime_age);

  let mesureProtection: MesureProtection | null = null;
  if (mandataire_judiciaire !== null) {
    const isMandataire = SIREC_BOOLEAN_TRANSCO[mandataire_judiciaire];
    if (isMandataire === undefined) throw new SirecTranscoError(mandataire_judiciaire, 'mandataire_judiciaire');
    mesureProtection = isMandataire ? MesureProtection.MANDATAIRE_JUDICIAIRE : null;
  }

  const mandatairePrecisezLabel = mandataire_precisez !== null ? SIREC_DICO[mandataire_precisez] : undefined;

  const victimeCommentaireParts = [
    victime_non_identifiee === 1 ? 'Usager (Victime) non identifié : oui' : null,
    victime_age !== null && victime_age >= 0 ? `Age de la victime : ${victime_age}` : null,
    mandatairePrecisezLabel ? `Précisions concernant le mandat judiciaire : ${mandatairePrecisezLabel}` : null,
  ].filter(Boolean) as string[];

  const commentaire = victimeCommentaireParts.join('\n');
  const hasVictimeData =
    identite !== null || adresse !== null || commentaire !== '' || ageId !== null || mesureProtection !== null;

  return hasVictimeData ? { identite, adresse, commentaire, ageId, mesureProtection } : null;
}
