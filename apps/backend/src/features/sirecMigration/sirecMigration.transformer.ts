import { generateSirenaIdFromSirecReclamation } from '../../helpers/sirecMigration.js';
import type { SirecReclamationRow } from './sirecMigration.repository.js';

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
}

export function transformSirecReclamation(row: SirecReclamationRow): SirenaRequeteData {
  return {
    sirenaId: generateSirenaIdFromSirecReclamation(row),
    sirecId: row.id_data,
  };
}
