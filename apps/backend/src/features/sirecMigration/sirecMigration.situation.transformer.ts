import { DEMARCHES_ENGAGEES } from '@sirena/common/constants';
import { type SirenaFaitData, transformSirecFait } from './sirecMigration.fait.transformer.js';
import type { SirecReclamationData } from './sirecMigration.repository.js';

export type { SirenaFaitData };

export interface SirenaSituationData {
  fait: SirenaFaitData;
  entiteIds: string[];
  demarchesIds: string[];
}

const SAISINE_PLAINTE = 75;

export function transformSirecSituation(sirecData: SirecReclamationData, entiteIds: string[]): SirenaSituationData {
  const demarchesIds = sirecData.reclamation.saisine === SAISINE_PLAINTE ? [DEMARCHES_ENGAGEES.PLAINTE] : [];

  return {
    fait: transformSirecFait(sirecData),
    entiteIds,
    demarchesIds,
  };
}
