import { ageLabels } from '../constants/requete.constant';

export const ageOptions = Object.entries(ageLabels).map(([value, label]) => ({
  label,
  value,
}));
