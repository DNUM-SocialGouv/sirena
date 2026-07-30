import {
  AUTRE_PROFESSIONNEL_PRECISION,
  LIEU_AUTRES_ETABLISSEMENTS_PRECISION,
  LIEU_TRAJET_PRECISION,
  LIEU_TYPE,
  MIS_EN_CAUSE_TYPE,
} from '@sirena/common/constants';
import { SIREC_DICO } from './dictionnaire.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

export const SIREC_TYPE_AUTRE = 67;

// A SIREC "autre mis en cause" value can land either on the accused party (mis en cause)
// or on the location (lieu), depending on the SIREC referential mapping.
export type AutreMcTarget =
  | { kind: 'misEnCause'; misEnCauseTypeId: string; misEnCauseTypePrecisionId: string | null }
  | { kind: 'lieu'; lieuTypeId: string; lieuPrecisionId: string | null };

const AUTRES_MC_TYPE_TRANSCO: Record<number, AutreMcTarget> = {
  120: {
    kind: 'misEnCause',
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.ACUPUNCTEUR,
  },
  121: {
    kind: 'misEnCause',
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.CHIROPRACTEUR,
  },
  122: { kind: 'lieu', lieuTypeId: LIEU_TYPE.ETABLISSEMENT_FICTIF, lieuPrecisionId: null },
  123: {
    kind: 'misEnCause',
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.EXERCICE_ILLEGAL,
  },
  124: {
    kind: 'lieu',
    lieuTypeId: LIEU_TYPE.AUTRES_ETABLISSEMENTS,
    lieuPrecisionId: LIEU_AUTRES_ETABLISSEMENTS_PRECISION.MAISON_ARRET,
  },
  125: {
    kind: 'misEnCause',
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.OSTEOPATHE,
  },
  126: { kind: 'misEnCause', misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL, misEnCauseTypePrecisionId: null },
  127: {
    kind: 'misEnCause',
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.PSYCHOTHERAPEUTE,
  },
  128: { kind: 'misEnCause', misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL, misEnCauseTypePrecisionId: null },
  129: {
    kind: 'misEnCause',
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.TATOUEUR,
  },
  130: {
    kind: 'lieu',
    lieuTypeId: LIEU_TYPE.TRAJET,
    lieuPrecisionId: LIEU_TRAJET_PRECISION.TRANSPORTEUR_SANITAIRE,
  },
  131: { kind: 'misEnCause', misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE, misEnCauseTypePrecisionId: null },
};

export function transcodeAutresMcType(autresMcType: number | null): AutreMcTarget | null {
  if (autresMcType === null) return null;
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
