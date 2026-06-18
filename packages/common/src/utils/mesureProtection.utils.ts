import type { MesureProtection } from '../schemas/index.js';

const MESURE_PROTECTION_PERSONNE_CONCERNEE_LABELS = {
  MANDATAIRE_JUDICIAIRE: 'mandataire judiciaire',
  HABILITATION_FAMILIALE: 'habilitation familiale',
} as const satisfies Record<Exclude<MesureProtection, 'NON'>, string>;

export const getMesureProtectionShortLabel = (mesureProtection: MesureProtection | null | undefined): string | null => {
  if (!mesureProtection || mesureProtection === 'NON') return null;

  return MESURE_PROTECTION_PERSONNE_CONCERNEE_LABELS[mesureProtection];
};

export const formatMesureProtectionPersonneConcernee = (
  mesureProtection: MesureProtection | null | undefined,
): string | null => {
  const shortLabel = getMesureProtectionShortLabel(mesureProtection);
  if (!shortLabel) return null;

  return `Il/elle est sous mesure de protection : ${shortLabel}`;
};
