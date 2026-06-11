import type { SirecReclamationRow } from '../features/sirecMigration/sirecMigration.repository.js';

export const generateSirenaIdFromSirecReclamation = (sirecReclamation: SirecReclamationRow) =>
  `SIREC-${sirecReclamation.id_data.toString()}`;
