import {
  REQUETE_ETAPE_STATUT_TYPES,
  REQUETE_STATUT_TYPES,
  requeteEtapeStatutType,
  requeteStatutType,
} from '@sirena/common/constants';

export type StatutBadge = {
  type: 'info' | 'new' | 'success' | 'error';
  text: string;
  value: string;
};

export const requeteStatutBadges: StatutBadge[] = [
  {
    type: 'info',
    text: requeteStatutType.NOUVEAU,
    value: REQUETE_STATUT_TYPES.NOUVEAU,
  },
  {
    type: 'new',
    text: requeteStatutType.EN_COURS,
    value: REQUETE_STATUT_TYPES.EN_COURS,
  },
  {
    type: 'error',
    text: requeteStatutType.CLOTUREE,
    value: REQUETE_STATUT_TYPES.CLOTUREE,
  },
] as const;

export const requeteEtapeStatutBadges: StatutBadge[] = [
  {
    type: 'success',
    text: requeteEtapeStatutType.FAIT,
    value: REQUETE_ETAPE_STATUT_TYPES.FAIT,
  },
  {
    type: 'new',
    text: requeteEtapeStatutType.EN_COURS,
    value: REQUETE_ETAPE_STATUT_TYPES.EN_COURS,
  },
  {
    type: 'info',
    text: requeteEtapeStatutType.A_FAIRE,
    value: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
  },
  {
    type: 'error',
    text: requeteEtapeStatutType.CLOTUREE,
    value: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
  },
] as const;
