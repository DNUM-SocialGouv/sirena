import {
  AUTRE_PROFESSIONNEL_PRECISION,
  CIVILITE,
  MIS_EN_CAUSE_TYPE,
  PROFESSION_SANTE_PRECISION,
  PROFESSION_SOCIAL_PRECISION,
} from '@sirena/common/constants';

interface TypePrecision {
  misEnCauseTypeId: string;
  misEnCauseTypePrecisionId: string;
}

const PRO_SANTE = MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE;
const PRO_SOCIAL = MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SOCIAL;
const AUTRE_PRO = MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL;

const FALLBACK: TypePrecision = {
  misEnCauseTypeId: AUTRE_PRO,
  misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.AUTRE,
};

const LIBELLE_PROF_TRANSCO: Record<string, TypePrecision> = {
  'Acteur du système de santé caractérisé par un rôle': {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.AUTRE,
  },
  'Assistant de service social': {
    misEnCauseTypeId: PRO_SOCIAL,
    misEnCauseTypePrecisionId: PROFESSION_SOCIAL_PRECISION.ASSISTANT_SOCIAL,
  },
  'Assistant dentaire': { misEnCauseTypeId: PRO_SANTE, misEnCauseTypePrecisionId: PROFESSION_SANTE_PRECISION.AUTRE },
  'Assistant social': {
    misEnCauseTypeId: PRO_SOCIAL,
    misEnCauseTypePrecisionId: PROFESSION_SOCIAL_PRECISION.ASSISTANT_SOCIAL,
  },
  'Audio-Prothésiste': {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.AUDIOPROTHESISTE,
  },
  Chiropracteur: {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.CHIROPRACTEUR,
  },
  'Chirurgien-Dentiste': { misEnCauseTypeId: PRO_SANTE, misEnCauseTypePrecisionId: PROFESSION_SANTE_PRECISION.AUTRE },
  Diététicien: { misEnCauseTypeId: AUTRE_PRO, misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.DIETETICIEN },
  Epithésiste: { misEnCauseTypeId: AUTRE_PRO, misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.EPITHESISTE },
  Ergothérapeute: { misEnCauseTypeId: AUTRE_PRO, misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.AUTRE },
  Infirmier: { misEnCauseTypeId: PRO_SANTE, misEnCauseTypePrecisionId: PROFESSION_SANTE_PRECISION.INFIRMIER },
  'Manipulateur ERM': {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.MANIPULATEUR_RADIO,
  },
  'Masseur-Kinésithérapeute': {
    misEnCauseTypeId: PRO_SANTE,
    misEnCauseTypePrecisionId: PROFESSION_SANTE_PRECISION.AUTRE,
  },
  Médecin: { misEnCauseTypeId: PRO_SANTE, misEnCauseTypePrecisionId: PROFESSION_SANTE_PRECISION.AUTRE },
  Oculariste: {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.OCULAIRE_OPTIQUE,
  },
  'Opticien-Lunetier': {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.OCULAIRE_OPTIQUE,
  },
  'Orthopédiste-Orthésiste': {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.ORTHESISTE,
  },
  Orthophoniste: {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.ORTHOPHONISTE,
  },
  Orthoprothésiste: {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.ORTHESISTE,
  },
  Orthoptiste: {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.OCULAIRE_OPTIQUE,
  },
  Ostéopathe: { misEnCauseTypeId: AUTRE_PRO, misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.OSTEOPATHE },
  'Pédicure-Podologue': { misEnCauseTypeId: AUTRE_PRO, misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.AUTRE },
  Pharmacien: { misEnCauseTypeId: PRO_SANTE, misEnCauseTypePrecisionId: PROFESSION_SANTE_PRECISION.PHARMACIEN },
  'Physicien médical': { misEnCauseTypeId: AUTRE_PRO, misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.AUTRE },
  'Podo-Orthésiste': {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.ORTHESISTE,
  },
  Psychologue: { misEnCauseTypeId: AUTRE_PRO, misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.PSYCHOLOGUE },
  Psychomotricien: {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.PSYCHOMOTRICIEN,
  },
  Psychothérapeute: {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.PSYCHOTHERAPEUTE,
  },
  'Sage-Femme': { misEnCauseTypeId: PRO_SANTE, misEnCauseTypePrecisionId: PROFESSION_SANTE_PRECISION.SAGE_FEMME },
  'Technicien de Laboratoire': {
    misEnCauseTypeId: AUTRE_PRO,
    misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.TECHNICIEN_LABO,
  },
};

export const SIREC_TYPE_RPPS = 65;

export function transcodeCiviliteRpps(civilite: string | null): string {
  if (!civilite) return '';
  const lower = civilite.toLowerCase();
  if (lower === 'mme' || lower === 'mlle') return CIVILITE.MME;
  if (lower === 'm') return CIVILITE.M;
  return '';
}

export function transcodeLibelleProfRpps(libelle: string | null): TypePrecision {
  if (!libelle?.trim()) return FALLBACK;
  return LIBELLE_PROF_TRANSCO[libelle] ?? FALLBACK;
}
