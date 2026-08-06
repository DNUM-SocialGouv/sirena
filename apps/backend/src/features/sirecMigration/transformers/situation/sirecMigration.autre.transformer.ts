import type { SirecMisEnCause } from '../../sirecMigration.repository.js';
import { buildAutrePrecision, transcodeAutresMcType } from '../../transco/misEnCauseAutre.transco.js';
import type { SirenaLieuDeSurvenueData } from './sirecMigration.finess.transformer.js';

export interface SirenaAutreMisEnCauseData {
  kind: 'autre';
  misEnCauseTypeId: string | null;
  misEnCauseTypePrecisionId: string | null;
  autrePrecision: string;
}

export interface SirenaAutreResult {
  misEnCauseData: SirenaAutreMisEnCauseData;
  lieuDeSurvenueData: SirenaLieuDeSurvenueData | null;
}

export function transformSirecAutre(misEnCause: SirecMisEnCause): SirenaAutreResult {
  const { misEnCauseTypeId, misEnCauseTypePrecisionId, lieuSurvenue } = transcodeAutresMcType(misEnCause.autresMcType);
  return {
    misEnCauseData: {
      kind: 'autre',
      misEnCauseTypeId,
      misEnCauseTypePrecisionId,
      autrePrecision: buildAutrePrecision(misEnCause.autresMcType, misEnCause.label, misEnCause.adresse),
    },
    lieuDeSurvenueData:
      lieuSurvenue === undefined
        ? null
        : {
            lieuTypeId: lieuSurvenue.lieuTypeId,
            ...(lieuSurvenue.lieuPrecision !== undefined && { lieuPrecision: lieuSurvenue.lieuPrecision }),
          },
  };
}
