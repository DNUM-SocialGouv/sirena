import { generateSirenaIdFromSirecReclamation } from '../../helpers/sirecMigration.js';
import { type SirenaFaitData, transformSirecFait } from './sirecMigration.fait.transformer.js';
import type { SirecReclamationRow } from './sirecMigration.repository.js';
import { type SirenaSituationData, transformSirecSituation } from './sirecMigration.situation.transformer.js';

export type { SirenaFaitData, SirenaSituationData };

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  fait: SirenaFaitData;
  situation: SirenaSituationData;
}

export function transformSirecReclamation(row: SirecReclamationRow): SirenaRequeteData {
  return {
    sirenaId: generateSirenaIdFromSirecReclamation(row),
    sirecId: row.id_data,
    receptionDate: row.r_recept_date,
    fait: transformSirecFait(row),
    situation: transformSirecSituation(row),
  };
}
