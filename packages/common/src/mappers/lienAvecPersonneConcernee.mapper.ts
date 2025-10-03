import { misEnCauseTypeLabels } from '../constants/requete.constant';

export const lienAvecPersonneConcerneeOptions = Object.entries(misEnCauseTypeLabels).map(([value, label]) => ({
  label,
  value,
}));
