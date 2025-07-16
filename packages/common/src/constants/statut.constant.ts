export const STATUT_TYPES = {
  ACTIF: 'ACTIF',
  INACTIF: 'INACTIF',
  NON_RENSEIGNE: 'NON_RENSEIGNE',
} as const;

export type StatutType = keyof typeof STATUT_TYPES;

export const statutTypes: Record<StatutType, string> = {
  [STATUT_TYPES.ACTIF]: 'Actif',
  [STATUT_TYPES.INACTIF]: 'Inactif',
  [STATUT_TYPES.NON_RENSEIGNE]: 'Non renseigné',
} as const;
