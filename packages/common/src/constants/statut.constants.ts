export const STATUT_TYPES = {
  ACTIF: 'ACTIF',
  INNACTIF: 'INNACTIF',
  NON_RENSEIGNE: 'NON_RENSEIGNE',
} as const;

export type StatutType = keyof typeof STATUT_TYPES;

export const statutTypes: Record<StatutType, string> = {
  [STATUT_TYPES.ACTIF]: 'Actif',
  [STATUT_TYPES.INNACTIF]: 'Innactif',
  [STATUT_TYPES.NON_RENSEIGNE]: 'Non renseigné',
} as const;
