import { ageLabels } from '../constants/requete.constant.js';

export const ageOptions = Object.entries(ageLabels).map(([value, label]) => ({
  label,
  value,
}));
