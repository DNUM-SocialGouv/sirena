import { type SirenaFaitData, transformSirecFait } from './sirecMigration.fait.transformer.js';
import type { SirecReclamationData } from './sirecMigration.repository.js';

export type { SirenaFaitData };

export interface SirenaSituationData {
  fait: SirenaFaitData;
}

export function transformSirecSituation(sirecData: SirecReclamationData): SirenaSituationData {
  return {
    fait: transformSirecFait(sirecData),
  };
}
