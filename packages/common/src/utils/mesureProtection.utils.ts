import { MESURE_PROTECTION } from '../constants/mesureProtection.constant.js';
import type { MesureProtection } from '../schemas/index.js';

const MESURE_PROTECTION_PERSONNE_CONCERNEE_LABELS = {
  [MESURE_PROTECTION.MANDATAIRE_JUDICIAIRE]: 'mandataire judiciaire',
  [MESURE_PROTECTION.MANDATAIRE_FAMILIAL]: 'mandataire familial',
} as const satisfies Record<
  Exclude<MesureProtection, typeof MESURE_PROTECTION.NON | typeof MESURE_PROTECTION.NON_RENSEIGNE>,
  string
>;

export const getMesureProtectionShortLabel = (mesureProtection: MesureProtection | null | undefined): string | null => {
  if (
    !mesureProtection ||
    mesureProtection === MESURE_PROTECTION.NON ||
    mesureProtection === MESURE_PROTECTION.NON_RENSEIGNE
  ) {
    return null;
  }

  return MESURE_PROTECTION_PERSONNE_CONCERNEE_LABELS[mesureProtection];
};

export const formatMesureProtectionPersonneConcernee = (
  mesureProtection: MesureProtection | null | undefined,
): string | null => {
  const shortLabel = getMesureProtectionShortLabel(mesureProtection);
  if (!shortLabel) return null;

  return `Il/elle est en mesure de protection : ${shortLabel}`;
};
