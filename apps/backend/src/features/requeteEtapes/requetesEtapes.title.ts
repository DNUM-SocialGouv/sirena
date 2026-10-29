import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES } from '@sirena/common/constants';

// Display title of a processing step, shared by the requête PDF and the requêtes CSV export.
export const getEtapeTitle = (type: string | null | undefined, statutId: string | null | undefined, nom: string) => {
  if (statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE) return 'Clôture';
  if (type === REQUETE_ETAPE_TYPES.CREATION) return 'Création de la requête';
  if (type === REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT) return "Envoi de l'accusé de réception";
  if (type === REQUETE_ETAPE_TYPES.REOPEN) return 'Réouverture de la requête';
  return nom;
};
