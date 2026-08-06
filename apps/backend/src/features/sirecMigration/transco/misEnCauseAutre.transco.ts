import {
  AUTRE_PROFESSIONNEL_PRECISION,
  LIEU_AUTRES_ETABLISSEMENTS_PRECISION,
  LIEU_TRAJET_PRECISION,
  LIEU_TYPE,
  MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION,
  MIS_EN_CAUSE_TYPE,
} from '@sirena/common/constants';
import { SIREC_DICO } from './dictionnaire.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

export const SIREC_TYPE_AUTRE = 67;

export interface AutreMcTranscoResult {
  misEnCauseTypeId: string | null;
  misEnCauseTypePrecisionId: string | null;
  lieuSurvenue?: {
    lieuTypeId: string;
    lieuPrecision?: string;
  };
}

const AUTRES_MC_TYPE_TRANSCO: Record<number, AutreMcTranscoResult> = {
  120: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.ACUPUNCTEUR,
  },
  121: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.CHIROPRACTEUR,
  },
  // Etablissement fictif : mis en cause requalifié en ETABLISSEMENT + lieu de survenue dédié
  122: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
    misEnCauseTypePrecisionId: MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.ETABLISSEMENT,
    lieuSurvenue: { lieuTypeId: LIEU_TYPE.ETABLISSEMENT_FICTIF },
  },
  123: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.EXERCICE_ILLEGAL,
  },
  // Maison d'arrêt : mis en cause requalifié en ETABLISSEMENT + lieu de survenue dédié
  124: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
    misEnCauseTypePrecisionId: MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.ETABLISSEMENT,
    lieuSurvenue: {
      lieuTypeId: LIEU_TYPE.AUTRES_ETABLISSEMENTS,
      lieuPrecision: LIEU_AUTRES_ETABLISSEMENTS_PRECISION.MAISON_ARRET,
    },
  },
  125: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.OSTEOPATHE,
  },
  126: { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL, misEnCauseTypePrecisionId: null },
  127: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.PSYCHOTHERAPEUTE,
  },
  128: { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL, misEnCauseTypePrecisionId: null },
  129: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.TATOUEUR,
  },
  // Transporteur sanitaire : mis en cause requalifié en ETABLISSEMENT + lieu de survenue dédié
  130: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
    misEnCauseTypePrecisionId: MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.ETABLISSEMENT,
    lieuSurvenue: {
      lieuTypeId: LIEU_TYPE.TRAJET,
      lieuPrecision: LIEU_TRAJET_PRECISION.TRANSPORTEUR_SANITAIRE,
    },
  },
  131: {
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PERSONNE_NON_PRO,
    misEnCauseTypePrecisionId: MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION.AUTRE,
  },
};

export function transcodeAutresMcType(autresMcType: number | null): AutreMcTranscoResult {
  if (autresMcType === null) return { misEnCauseTypeId: null, misEnCauseTypePrecisionId: null };
  const result = AUTRES_MC_TYPE_TRANSCO[autresMcType];
  if (result === undefined) throw new SirecTranscoError(autresMcType, 'autresMcType');
  return result;
}

export function buildAutrePrecision(autresMcType: number | null, label: string | null, adresse: string | null): string {
  const typeLabel = autresMcType !== null ? (SIREC_DICO[autresMcType] ?? 'Autre') : 'Autre';
  return [
    `Type de mis en cause : ${typeLabel}`,
    `Nom / structure : ${label ?? 'Non renseigné'}`,
    `Adresse : ${adresse ?? 'Non renseignée'}`,
  ].join('\n');
}
