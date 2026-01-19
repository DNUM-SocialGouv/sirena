import { lienVictimeLabels } from '../constants/requete.constant.js';

export const lienAvecPersonneConcerneeOptions = Object.entries(lienVictimeLabels).map(([value, label]) => ({
  label,
  value,
}));
