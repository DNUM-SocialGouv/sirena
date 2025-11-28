export const REQUETE_ETAPE_STATUT_TYPES = {
  EN_COURS: 'EN_COURS',
  A_FAIRE: 'A_FAIRE',
  FAIT: 'FAIT',
  CLOTUREE: 'CLOTUREE',
} as const;

export type RequeteEtapeStatutType = keyof typeof REQUETE_ETAPE_STATUT_TYPES;

export const requeteEtapeStatutType: Record<RequeteEtapeStatutType, string> = {
  [REQUETE_ETAPE_STATUT_TYPES.EN_COURS]: 'En cours',
  [REQUETE_ETAPE_STATUT_TYPES.A_FAIRE]: 'À faire',
  [REQUETE_ETAPE_STATUT_TYPES.FAIT]: 'Fait',
  [REQUETE_ETAPE_STATUT_TYPES.CLOTUREE]: 'Clôturée',
} as const;

export const REQUETE_STATUT_TYPES = {
  NOUVEAU: 'NOUVEAU',
  EN_COURS: 'EN_COURS',
  CLOTUREE: 'CLOTUREE',
} as const;

export type RequeteStatutType = keyof typeof REQUETE_STATUT_TYPES;

export const requeteStatutType: Record<RequeteStatutType, string> = {
  [REQUETE_STATUT_TYPES.NOUVEAU]: 'Nouveau',
  [REQUETE_STATUT_TYPES.EN_COURS]: 'En cours',
  [REQUETE_STATUT_TYPES.CLOTUREE]: 'Clôturée',
} as const;
