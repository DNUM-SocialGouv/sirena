import { type SirenaFaitData, transformSirecFait } from './sirecMigration.fait.transformer.js';
import type { SirecReclamationRow } from './sirecMigration.repository.js';

export type { SirenaFaitData };

export interface SirenaSituationData {
  fait: SirenaFaitData;
}

export function transformSirecSituation(row: SirecReclamationRow): SirenaSituationData {
  return {
    fait: transformSirecFait(row),
  };
}
