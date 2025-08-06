export const REQUETE_STATUT_TYPES = {
  EN_COURS: 'EN_COURS',
  A_FAIRE: 'A_FAIRE',
  FAIT: 'FAIT',
} as const;

export type RequeteStatutType = keyof typeof REQUETE_STATUT_TYPES;

export const requeteStatutType: Record<RequeteStatutType, string> = {
  [REQUETE_STATUT_TYPES.EN_COURS]: 'En cours',
  [REQUETE_STATUT_TYPES.A_FAIRE]: 'À faire',
  [REQUETE_STATUT_TYPES.FAIT]: 'Fait',
} as const;
