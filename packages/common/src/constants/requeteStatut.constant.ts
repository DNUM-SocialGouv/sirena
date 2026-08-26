export const REQUETE_ETAPE_STATUT_TYPES = {
  A_FAIRE: 'A_FAIRE',
  FAIT: 'FAIT',
  CLOTUREE: 'CLOTUREE',
} as const;

export type RequeteEtapeStatutType = keyof typeof REQUETE_ETAPE_STATUT_TYPES;

export const requeteEtapeStatutType: Record<RequeteEtapeStatutType, string> = {
  [REQUETE_ETAPE_STATUT_TYPES.A_FAIRE]: 'À faire',
  [REQUETE_ETAPE_STATUT_TYPES.FAIT]: 'Fait',
  [REQUETE_ETAPE_STATUT_TYPES.CLOTUREE]: 'Clôturée',
} as const;

export const REQUETE_STATUT_TYPES = {
  NOUVEAU: 'NOUVEAU',
  EN_COURS: 'EN_COURS',
  CLOTUREE: 'CLOTUREE',
  TRAITEE: 'TRAITEE',
} as const;

export type RequeteStatutType = keyof typeof REQUETE_STATUT_TYPES;

export const requeteStatutType: Record<RequeteStatutType, string> = {
  [REQUETE_STATUT_TYPES.NOUVEAU]: 'Nouveau',
  [REQUETE_STATUT_TYPES.EN_COURS]: 'En cours',
  [REQUETE_STATUT_TYPES.CLOTUREE]: 'Clôturée',
  [REQUETE_STATUT_TYPES.TRAITEE]: 'Pris en compte',
} as const;

export const REQUETE_ETAPE_TYPES = {
  CREATION: 'CREATION',
  ACKNOWLEDGMENT: 'ACKNOWLEDGMENT',
  REOPEN: 'REOPEN',
  MANUAL: 'MANUAL',
  ASSIGNMENT: 'ASSIGNMENT',
} as const;

export type RequeteEtapeType = keyof typeof REQUETE_ETAPE_TYPES;

export const ACKNOWLEDGMENT_SEND_MODES = {
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL',
} as const;

export type AcknowledgmentSendMode = keyof typeof ACKNOWLEDGMENT_SEND_MODES;

export const REQUETE_ETAPE_RAPPEL_TYPES = {
  JOURS_7: 'JOURS_7',
  JOURS_15: 'JOURS_15',
  JOURS_30: 'JOURS_30',
  PERSONNALISE: 'PERSONNALISE',
} as const;

export type RequeteEtapeRappelType = keyof typeof REQUETE_ETAPE_RAPPEL_TYPES;

export const requeteEtapeRappelType: Record<RequeteEtapeRappelType, string> = {
  [REQUETE_ETAPE_RAPPEL_TYPES.JOURS_7]: '7 jours',
  [REQUETE_ETAPE_RAPPEL_TYPES.JOURS_15]: '15 jours',
  [REQUETE_ETAPE_RAPPEL_TYPES.JOURS_30]: '30 jours',
  [REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE]: 'Date personnalisée',
} as const;

export const RAPPEL_DATE_REQUIRED_MESSAGE =
  'Le champ « Rappeler cette étape le » est obligatoire lorsque vous choisissez une date personnalisée.';

export const requeteEtapeRappelDelaiJours = {
  [REQUETE_ETAPE_RAPPEL_TYPES.JOURS_7]: 7,
  [REQUETE_ETAPE_RAPPEL_TYPES.JOURS_15]: 15,
  [REQUETE_ETAPE_RAPPEL_TYPES.JOURS_30]: 30,
} as const;

export const REQUETE_PRIORITE_TYPES = {
  BASSE: 'BASSE',
  MOYENNE: 'MOYENNE',
  HAUTE: 'HAUTE',
} as const;

export type RequetePrioriteType = keyof typeof REQUETE_PRIORITE_TYPES;

export const requetePrioriteType: Record<RequetePrioriteType, string> = {
  [REQUETE_PRIORITE_TYPES.BASSE]: 'Basse',
  [REQUETE_PRIORITE_TYPES.MOYENNE]: 'Moyenne',
  [REQUETE_PRIORITE_TYPES.HAUTE]: 'Haute',
} as const;
