import type { SirecRppsData } from '../../sirecMigration.repository.js';
import { transcodeCiviliteRpps, transcodeLibelleProfRpps } from '../../transco/misEnCauseRpps.transco.js';

export interface SirenaRppsMisEnCauseData {
  kind: 'rpps';
  rpps: string;
  civilite: string;
  nom: string;
  prenom: string;
  codePostal: string | null;
  ville: string | null;
  misEnCauseTypeId: string | null;
  misEnCauseTypePrecisionId: string | null;
  autrePrecision?: string;
}

export function transformSirecRpps(rppsData: SirecRppsData): SirenaRppsMisEnCauseData {
  const { misEnCauseTypeId, misEnCauseTypePrecisionId } = transcodeLibelleProfRpps(rppsData.libelle_prof);
  return {
    kind: 'rpps',
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
