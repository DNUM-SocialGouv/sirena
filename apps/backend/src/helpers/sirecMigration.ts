import type { SirecReclamationRow } from '../features/sirecMigration/sirecMigration.repository.js';

export const generateSirenaIdFromSirecReclamation = (sirecReclamation: SirecReclamationRow) =>
  `SIREC-${sirecReclamation.id_data.toString()}`;

export const formatSirecDate = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};
