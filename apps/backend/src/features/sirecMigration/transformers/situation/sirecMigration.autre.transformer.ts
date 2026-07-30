import type { SirecMisEnCause } from '../../sirecMigration.repository.js';
import {
  type AutreMcTarget,
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

// SIREC "autre" values that map to a location carry a name/address on the SIREC record;
// they are moved onto the lieu so nothing is lost when there is no mis en cause.
function buildAutreLieu(
  target: Extract<AutreMcTarget, { kind: 'lieu' }>,
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
