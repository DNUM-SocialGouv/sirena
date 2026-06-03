import { DEMARCHES_ENGAGEES } from '@sirena/common/constants';
import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { type SirenaFaitData, transformSirecFait } from './sirecMigration.fait.transformer.js';
import type { SirenaMisEnCauseData } from './sirecMigration.rpps.transformer.js';

export type { SirenaFaitData, SirenaMisEnCauseData };

export interface SirenaSituationData {
  fait: SirenaFaitData;
  entiteIds: string[];
  demarchesIds: string[];
  misEnCauseData: SirenaMisEnCauseData | null;
}

const SAISINE_PLAINTE = 75;

export function transformSirecSituation(sirecData: SirecReclamationData, entiteIds: string[]): SirenaSituationData {
  const demarchesIds = sirecData.reclamation.saisine === SAISINE_PLAINTE ? [DEMARCHES_ENGAGEES.PLAINTE] : [];

  return {
    fait: transformSirecFait(sirecData),
    entiteIds,
    demarchesIds,
    misEnCauseData: null,
  };
}
