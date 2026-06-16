import { DEMARCHES_ENGAGEES } from '@sirena/common/constants';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import type { SirenaAutreMisEnCauseData } from './sirecMigration.autre.transformer.js';
import { type SirenaFaitData, transformSirecFait } from './sirecMigration.fait.transformer.js';
import type { SirenaFinessMisEnCauseData, SirenaLieuDeSurvenueData } from './sirecMigration.finess.transformer.js';
import type { SirenaRppsMisEnCauseData } from './sirecMigration.rpps.transformer.js';

export type SirenaMisEnCauseData = SirenaRppsMisEnCauseData | SirenaFinessMisEnCauseData | SirenaAutreMisEnCauseData;
export type {
  SirenaAutreMisEnCauseData,
  SirenaFaitData,
  SirenaFinessMisEnCauseData,
  SirenaLieuDeSurvenueData,
  SirenaRppsMisEnCauseData,
};

export interface SirenaSituationData {
  fait: SirenaFaitData;
  entiteIds: string[];
  demarchesIds: string[];
  misEnCauseData: SirenaMisEnCauseData | null;
  lieuDeSurvenueData: SirenaLieuDeSurvenueData | null;
}

const SAISINE_PLAINTE = 75;

export function transformSirecSituation(sirecData: SirecReclamationData, entiteIds: string[]): SirenaSituationData {
  const demarchesIds = sirecData.reclamation.saisine === SAISINE_PLAINTE ? [DEMARCHES_ENGAGEES.PLAINTE] : [];

  return {
    fait: transformSirecFait(sirecData),
    entiteIds,
    demarchesIds,
    misEnCauseData: null,
    lieuDeSurvenueData: null,
  };
}
