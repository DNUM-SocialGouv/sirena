import { lienVictimeLabels } from '../constants/requete.constant';

export const lienAvecPersonneConcerneeOptions = Object.entries(lienVictimeLabels).map(([value, label]) => ({
  label,
  value,
}));
