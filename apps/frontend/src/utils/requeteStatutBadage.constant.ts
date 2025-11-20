import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';

export const allBadges = [
  {
    type: 'success',
    text: 'Fait',
    value: REQUETE_STATUT_TYPES.FAIT,
  },
  {
    type: 'new',
    text: 'En cours',
    value: REQUETE_STATUT_TYPES.EN_COURS,
  },
  {
    type: 'info',
    text: 'À faire',
    value: REQUETE_STATUT_TYPES.A_FAIRE,
  },
  {
    type: 'error',
    text: 'Clôturée',
    value: REQUETE_STATUT_TYPES.CLOTUREE,
  },
] as const;
