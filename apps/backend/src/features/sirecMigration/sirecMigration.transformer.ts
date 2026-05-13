import { generateSirenaIdFromSirecReclamation } from '../../helpers/sirecMigration.js';
import type { SirecReclamationRow } from './sirecMigration.repository.js';
import { type SirenaSituationData, transformSirecSituation } from './sirecMigration.situation.transformer.js';

export type { SirenaSituationData };

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  situation: SirenaSituationData;
}

export function transformSirecReclamation(row: SirecReclamationRow): SirenaRequeteData {
  return {
    sirenaId: generateSirenaIdFromSirecReclamation(row),
    sirecId: row.id_data,
    receptionDate: row.r_recept_date,
    situation: transformSirecSituation(row),
  };
}
