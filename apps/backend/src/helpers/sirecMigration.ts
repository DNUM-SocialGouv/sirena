import type { SirecReclamationRow } from '../features/sirecMigration/sirecMigration.repository.js';

export const generateSirenaIdFromSirecReclamation = (sirecReclamation: SirecReclamationRow) =>
  `SIREC-${sirecReclamation.id_data.toString()}`;

export const formatSirecDate = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

// MariaDB renvoie les dates comme des Date JS en heure locale (ex: 2020-04-13T22:00:00Z pour UTC+2).
// Prisma écrit la composante UTC dans les champs @db.Date, ce qui décale d'un jour.
// Cette fonction reconstruit midnight UTC depuis les composantes locales pour éviter le décalage.
export const toSirecLocalDate = (date: Date): Date =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
