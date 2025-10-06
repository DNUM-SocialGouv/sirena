import { CIVILITE, civiliteLabels } from '../constants/requete.constant';

export const CIVILITE_MAPPING = {
  FRONTEND_TO_DB: {
    monsieur: CIVILITE.M,
    madame: CIVILITE.MME,
  } as const,
  DB_TO_FRONTEND: {
    [CIVILITE.M]: 'monsieur',
    [CIVILITE.MME]: 'madame',
  } as const,
} as const;

export const civiliteOptions = Object.entries(civiliteLabels)
  .filter(([value]) => value in CIVILITE_MAPPING.DB_TO_FRONTEND)
  .map(([value, label]) => ({
    label,
    value: CIVILITE_MAPPING.DB_TO_FRONTEND[value as keyof typeof CIVILITE_MAPPING.DB_TO_FRONTEND],
  }));

export const mapCiviliteToDatabase = (civilite?: string): string | null | undefined => {
  if (!civilite) return null;
  return CIVILITE_MAPPING.FRONTEND_TO_DB[civilite.toLowerCase() as keyof typeof CIVILITE_MAPPING.FRONTEND_TO_DB];
};

export const mapCiviliteToFrontend = (civiliteId?: string | null): string => {
  if (!civiliteId) return '';
  return CIVILITE_MAPPING.DB_TO_FRONTEND[civiliteId as keyof typeof CIVILITE_MAPPING.DB_TO_FRONTEND] || '';
};
