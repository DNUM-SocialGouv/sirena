export const CIVILITE_MAPPING = {
  FRONTEND_TO_DB: {
    monsieur: 'M',
    madame: 'MME',
  } as const,
  DB_TO_FRONTEND: {
    M: 'monsieur',
    MME: 'madame',
  } as const,
} as const;

export const mapCiviliteToDatabase = (civilite?: string): string | null | undefined => {
  if (!civilite) return null;
  return CIVILITE_MAPPING.FRONTEND_TO_DB[civilite.toLowerCase() as keyof typeof CIVILITE_MAPPING.FRONTEND_TO_DB];
};

export const mapCiviliteToFrontend = (civiliteId?: string | null): string => {
  if (!civiliteId) return '';
  return CIVILITE_MAPPING.DB_TO_FRONTEND[civiliteId as keyof typeof CIVILITE_MAPPING.DB_TO_FRONTEND] || '';
};
