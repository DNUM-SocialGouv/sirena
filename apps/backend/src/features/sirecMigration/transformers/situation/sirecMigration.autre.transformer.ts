import type { SirecMisEnCause } from '../../sirecMigration.repository.js';
import {
  type AutreMisEnCauseTarget,
  buildAutrePrecision,
  transcodeAutresMcType,
} from '../../transco/misEnCauseAutre.transco.js';
import type { SirenaLieuDeSurvenueData } from './sirecMigration.finess.transformer.js';

export interface SirenaAutreMisEnCauseData {
  kind: 'autre';
  misEnCauseTypeId: string | null;
  misEnCauseTypePrecisionId: string | null;
  autrePrecision: string;
}

export interface SirecAutreResult {
  misEnCauseData: SirenaAutreMisEnCauseData | null;
  lieuDeSurvenueData: SirenaLieuDeSurvenueData | null;
}

// Some SIREC "autre" values actually represent a location.
// In that case, the name and address are stored on the lieu because no misEnCause is created.
function buildAutreLieu(
  target: Extract<AutreMisEnCauseTarget, { kind: 'lieu' }>,
  misEnCause: SirecMisEnCause,
): SirenaLieuDeSurvenueData {
  return {
    finess: '',
    codePostal: '',
    categCode: '',
    categLib: '',
    lieuTypeId: target.lieuTypeId,
    lieuPrecision: target.lieuPrecisionId ?? '',
    commentaire: '',
    adresse: {
      label: misEnCause.label ?? '',
      numero: '',
      rue: misEnCause.adresse ?? '',
      codePostal: '',
      ville: '',
    },
  };
}

export function transformSirecAutre(misEnCause: SirecMisEnCause): SirecAutreResult {
  const target = transcodeAutresMcType(misEnCause.autresMcType);

  if (target !== null && target.kind === 'lieu') {
    return { misEnCauseData: null, lieuDeSurvenueData: buildAutreLieu(target, misEnCause) };
  }

  return {
    misEnCauseData: {
      kind: 'autre',
      misEnCauseTypeId: target?.misEnCauseTypeId ?? null,
      misEnCauseTypePrecisionId: target?.misEnCauseTypePrecisionId ?? null,
      autrePrecision: buildAutrePrecision(misEnCause.autresMcType, misEnCause.label, misEnCause.adresse),
    },
    lieuDeSurvenueData: null,
  };
}
