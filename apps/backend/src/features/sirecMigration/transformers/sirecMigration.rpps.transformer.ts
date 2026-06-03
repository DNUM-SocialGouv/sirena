import type { SirecRppsData } from '../sirecMigration.repository.js';
import { transcodeCiviliteRpps, transcodeLibelleProfRpps } from '../transco/misEnCauseRpps.transco.js';

export interface SirenaMisEnCauseData {
  rpps: string;
  civilite: string;
  nom: string;
  prenom: string;
  codePostal: string | null;
  ville: string | null;
  misEnCauseTypeId: string;
  misEnCauseTypePrecisionId: string;
}

export function transformSirecRpps(rppsData: SirecRppsData): SirenaMisEnCauseData {
  const { misEnCauseTypeId, misEnCauseTypePrecisionId } = transcodeLibelleProfRpps(rppsData.libelle_prof);
  return {
    rpps: rppsData.rpps ?? '',
    civilite: transcodeCiviliteRpps(rppsData.civilite),
    nom: rppsData.nom ?? '',
    prenom: rppsData.prenom ?? '',
    codePostal: rppsData.code_postal,
    ville: rppsData.commune,
    misEnCauseTypeId,
    misEnCauseTypePrecisionId,
  };
}
