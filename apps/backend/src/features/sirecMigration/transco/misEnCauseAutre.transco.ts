import { AUTRE_PROFESSIONNEL_PRECISION, MIS_EN_CAUSE_TYPE } from '@sirena/common/constants';
import { SIREC_DICO } from './dictionnaire.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

export const SIREC_TYPE_AUTRE = 67;

interface AutreMcTranscoResult {
  misEnCauseTypeId: string | null;
  misEnCauseTypePrecisionId: string | null;
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
  122: { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.ETABLISSEMENT_FICTIF, misEnCauseTypePrecisionId: null },
  123: { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.EXERCICE_ILLEGAL, misEnCauseTypePrecisionId: null },
  124: { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.MAISON_ARRET, misEnCauseTypePrecisionId: null },
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
  130: { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.TRANSPORTEUR_SANITAIRE, misEnCauseTypePrecisionId: null },
  131: { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE, misEnCauseTypePrecisionId: null },
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
