import type { SirecMisEnCause } from '../sirecMigration.repository.js';
import { buildAutrePrecision, transcodeAutresMcType } from '../transco/misEnCauseAutre.transco.js';

export interface SirenaAutreMisEnCauseData {
  kind: 'autre';
  misEnCauseTypeId: string | null;
  misEnCauseTypePrecisionId: string | null;
  autrePrecision: string;
}

export function transformSirecAutre(misEnCause: SirecMisEnCause): SirenaAutreMisEnCauseData {
  const { misEnCauseTypeId, misEnCauseTypePrecisionId } = transcodeAutresMcType(misEnCause.autresMcType);
  return {
    kind: 'autre',
    misEnCauseTypeId,
    misEnCauseTypePrecisionId,
    autrePrecision: buildAutrePrecision(misEnCause.autresMcType, misEnCause.label, misEnCause.adresse),
  };
}
