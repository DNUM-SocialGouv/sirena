export const REQUETE_STATUT_TYPES = {
  BROUILLON: 'BROUILLON',
  EN_COURS: 'EN_COURS',
  CLOTUREE: 'CLOTUREE',
  A_QUALIFIER: 'A_QUALIFIER',
} as const;

export type RequeteStatutType = keyof typeof REQUETE_STATUT_TYPES;

export const requeteStatutType: Record<RequeteStatutType, string> = {
  [REQUETE_STATUT_TYPES.BROUILLON]: 'Brouillon',
  [REQUETE_STATUT_TYPES.EN_COURS]: 'En cours',
  [REQUETE_STATUT_TYPES.CLOTUREE]: 'Clôturée',
  [REQUETE_STATUT_TYPES.A_QUALIFIER]: 'À qualifier',
} as const;
