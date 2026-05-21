import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { generateSirenaIdFromSirecReclamation } from '../../helpers/sirecMigration.js';
import { transformSirecAffectation } from './sirecMigration.affectation.transformer.js';
import type { SirecReclamationData } from './sirecMigration.repository.js';
import { type SirenaSituationData, transformSirecSituation } from './sirecMigration.situation.transformer.js';
import { transcodeDeclarant } from './transco/declarant.transco.js';
import { SIREC_DICO } from './transco/dictionnaire.transco.js';
import { transcodePlaignantAnonyme } from './transco/plaignantAnonyme.transco.js';
import { transcodeReceptionType } from './transco/receptionType.transco.js';

const PLAIGNANT_TYPE_PAS_PHYSIQUE = new Set([22, 106]);

export type { SirenaSituationData };

export interface SirenaAdresseData {
  rue: string | null;
  codePostal: string | null;
  ville: string | null;
}

export interface SirenaDeclarantData {
  estVictime: boolean | null;
  veutGarderAnonymat: boolean | null;
  adresse: SirenaAdresseData | null;
  commentaire: string;
}

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  receptionTypeId: string | null;
  prioriteId: string | null;
  declarant: SirenaDeclarantData | null;
  requeteEntiteIds: string[];
  situation: SirenaSituationData;
}

export function transformSirecReclamation(sirecData: SirecReclamationData): SirenaRequeteData {
  const { requeteEntiteIds, situationEntiteIds } = transformSirecAffectation(sirecData);
  const estVictime = transcodeDeclarant(sirecData.reclamation.plaignant);
  const veutGarderAnonymat = transcodePlaignantAnonyme(sirecData.reclamation.plaignant_anonyme);
  const {
    plaignant_type,
    plaignant_adresse,
    plaignant_adresse_complement,
    requerant_adresse,
    requerant_cp,
    requerant_ville,
    preciser_statut,
    plaignant_rs,
    nom_representant,
    prenom_representant,
  } = sirecData.reclamation;
  const plaignantTypeLabel = plaignant_type !== null ? SIREC_DICO[plaignant_type] : undefined;
  const showPlaignantTypeDetails = plaignant_type !== null && PLAIGNANT_TYPE_PAS_PHYSIQUE.has(plaignant_type);
  const plaignantEstPhysique = plaignant_type !== null && !PLAIGNANT_TYPE_PAS_PHYSIQUE.has(plaignant_type);
  const rue = plaignantEstPhysique
    ? [plaignant_adresse, plaignant_adresse_complement, requerant_adresse].filter(Boolean).join(' ') || null
    : null;
  const adresseNonPhysiqueTexte = !plaignantEstPhysique
    ? [requerant_adresse, requerant_cp, requerant_ville].filter(Boolean).join(' ') || null
    : null;
  const adresse: SirenaAdresseData | null =
    plaignantEstPhysique && (rue || requerant_cp || requerant_ville)
      ? { rue, codePostal: requerant_cp, ville: requerant_ville }
      : null;
  const declarantCommentaireParts = [
    sirecData.reclamation.plaignant_est_anonyme === 1 ? 'Le requérant est anonyme : oui' : null,
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
    estVictime !== null || veutGarderAnonymat !== null || adresse !== null || declarantCommentaire !== '';

  return {
    sirenaId: generateSirenaIdFromSirecReclamation(sirecData.reclamation),
    sirecId: sirecData.reclamation.id_data,
    receptionDate: sirecData.reclamation.r_recept_date,
    receptionTypeId: transcodeReceptionType(sirecData.reclamation.reception),
    prioriteId: sirecData.reclamation.prioritaire === 1 ? REQUETE_PRIORITE_TYPES.HAUTE : null,
    declarant: hasDeclarantData ? { estVictime, veutGarderAnonymat, adresse, commentaire: declarantCommentaire } : null,
    requeteEntiteIds,
    situation: transformSirecSituation(sirecData, situationEntiteIds),
  };
}
