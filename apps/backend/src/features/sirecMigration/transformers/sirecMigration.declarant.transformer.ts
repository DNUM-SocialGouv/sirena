import type { SirecReclamationRow } from '../sirecMigration.repository.js';
import { transcodeDeclarant } from '../transco/declarant.transco.js';
import { SIREC_DICO } from '../transco/dictionnaire.transco.js';
import { transcodePlaignantAnonyme } from '../transco/plaignantAnonyme.transco.js';
import { transcodeSignalement } from '../transco/signalement.transco.js';
import { transcodeVictimeLienPlaignant } from '../transco/victimeLienPlaignant.transco.js';

const PLAIGNANT_TYPE_PAS_PHYSIQUE = new Set([22, 106]);

export interface SirenaAdresseData {
  rue: string | null;
  codePostal: string | null;
  ville: string | null;
}

export interface SirenaIdentiteData {
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  civiliteId: string | null;
}

export interface SirenaDeclarantData {
  estVictime: boolean | null;
  veutGarderAnonymat: boolean | null;
  lienVictimeId: string | null;
  lienAutrePrecision: string | null;
  adresse: SirenaAdresseData | null;
  identite: SirenaIdentiteData | null;
  commentaire: string;
  estSignalementProfessionnel: boolean | null;
}
export function transformDeclarantIdentite(reclamation: SirecReclamationRow): SirenaIdentiteData | null {
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

export function transformSirecDeclarant(reclamation: SirecReclamationRow): SirenaDeclarantData | null {
  const estVictime = transcodeDeclarant(reclamation.plaignant);
  const estSignalementProfessionnel = transcodeSignalement(reclamation.signalement);

  if (estVictime === true) {
    return {
      estVictime: true,
      veutGarderAnonymat: null,
      lienVictimeId: null,
      lienAutrePrecision: null,
      adresse: null,
      identite: null,
      commentaire: '',
      estSignalementProfessionnel,
    };
  }

  const veutGarderAnonymat = transcodePlaignantAnonyme(reclamation.plaignant_anonyme);
  const lienVictimeId = transcodeVictimeLienPlaignant(reclamation.victime_lien_plaignant);
  const {
    plaignant_type,
    plaignant_adresse,
    plaignant_adresse_complement,
    requerant_adresse,
    requerant_adresse_complete,
    requerant_cp,
    requerant_ville,
    preciser_statut,
    plaignant_rs,
    nom_representant,
    prenom_representant,
    plaignant_connu,
    lien_plai_autre,
  } = reclamation;

  const identite = transformDeclarantIdentite(reclamation);

  const plaignantTypeLabel = plaignant_type !== null ? SIREC_DICO[plaignant_type] : undefined;
  const showPlaignantTypeDetails = plaignant_type !== null && PLAIGNANT_TYPE_PAS_PHYSIQUE.has(plaignant_type);
  const plaignantEstPhysique = plaignant_type !== null && !PLAIGNANT_TYPE_PAS_PHYSIQUE.has(plaignant_type);
  const effectiveRequerantAdresse = requerant_adresse || requerant_adresse_complete;
  const rue = plaignantEstPhysique
    ? [plaignant_adresse, plaignant_adresse_complement, effectiveRequerantAdresse].filter(Boolean).join(' ') || null
    : null;
  const adresseNonPhysiqueTexte = !plaignantEstPhysique
    ? [requerant_adresse, requerant_cp, requerant_ville].filter(Boolean).join(' ') || null
    : null;
  const adresse: SirenaAdresseData | null =
    plaignantEstPhysique && (rue || requerant_cp || requerant_ville)
      ? { rue, codePostal: requerant_cp, ville: requerant_ville }
      : null;

  const declarantCommentaireParts = [
    reclamation.plaignant_est_anonyme === 1 ? 'Le requérant est anonyme : oui' : null,
    plaignant_connu === 1 ? 'Plus de 2 réclamations déposées : oui' : null,
    showPlaignantTypeDetails && plaignantTypeLabel ? `Statut : ${plaignantTypeLabel}` : null,
    showPlaignantTypeDetails && preciser_statut ? `Précisions : ${preciser_statut}` : null,
    showPlaignantTypeDetails && plaignant_rs ? `Raison sociale : ${plaignant_rs}` : null,
    showPlaignantTypeDetails && nom_representant ? `Nom du représentant des requérants : ${nom_representant}` : null,
    showPlaignantTypeDetails && prenom_representant
      ? `Prénom du représentant des requérants : ${prenom_representant}`
      : null,
    adresseNonPhysiqueTexte ? `Adresse : ${adresseNonPhysiqueTexte}` : null,
    !plaignantEstPhysique && plaignant_adresse_complement
      ? `Complément d'adresse : ${plaignant_adresse_complement}`
      : null,
  ].filter(Boolean) as string[];

  const declarantCommentaire = declarantCommentaireParts.join('\n');
  const hasDeclarantData =
    estVictime !== null ||
    veutGarderAnonymat !== null ||
    lienVictimeId !== null ||
    lien_plai_autre !== null ||
    adresse !== null ||
    identite !== null ||
    declarantCommentaire !== '' ||
    estSignalementProfessionnel !== null;

  return hasDeclarantData
    ? {
        estVictime,
        veutGarderAnonymat,
        lienVictimeId,
        lienAutrePrecision: lien_plai_autre,
        adresse,
        identite,
        commentaire: declarantCommentaire,
        estSignalementProfessionnel,
      }
    : null;
}
