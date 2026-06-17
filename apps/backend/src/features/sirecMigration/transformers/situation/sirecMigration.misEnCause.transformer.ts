import type { SirecMisEnCause, SirecReclamationData } from '../../sirecMigration.repository.js';
import { SIREC_BOOLEAN_TRANSCO } from '../../transco/dictionnaire.transco.js';
import { SIREC_TYPE_FINESS } from '../../transco/finessCategetab.transco.js';
import { SIREC_TYPE_AUTRE } from '../../transco/misEnCauseAutre.transco.js';
import { SIREC_TYPE_RPPS } from '../../transco/misEnCauseRpps.transco.js';
import { SirecDataError, SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { computeSituationEntiteIds } from './sirecMigration.affectation.transformer.js';
import { transformSirecAutre } from './sirecMigration.autre.transformer.js';
import {
  type SirenaFinessResult,
  type SirenaLieuDeSurvenueData,
  transformSirecFiness,
} from './sirecMigration.finess.transformer.js';
import { transformSirecRpps } from './sirecMigration.rpps.transformer.js';
import {
  type SirenaMisEnCauseData,
  type SirenaSituationData,
  transformSirecSituation,
} from './sirecMigration.situation.transformer.js';

const SANS_MEC_DATA = {
  kind: 'autre' as const,
  misEnCauseTypeId: null,
  misEnCauseTypePrecisionId: null,
  autrePrecision: 'Sans mis en cause',
};

function applyObservation(data: SirenaMisEnCauseData | null, observation: string | null): SirenaMisEnCauseData | null {
  if (!observation || data === null) return data;
  const suffix = `Observations : ${observation}`;
  if (data.kind === 'autre') {
    return { ...data, autrePrecision: data.autrePrecision ? `${data.autrePrecision}\n${suffix}` : suffix };
  }
  return { ...data, autrePrecision: suffix };
}

function resolveSansMc(sansMc: number | null): SirenaMisEnCauseData | null {
  if (sansMc === null) return null;
  const value = SIREC_BOOLEAN_TRANSCO[sansMc];
  if (value === undefined) throw new SirecTranscoError(sansMc, 'sans_mc');
  return value ? SANS_MEC_DATA : null;
}

interface MisEnCauseResolution {
  misEnCauseData: SirenaMisEnCauseData | null;
  lieuDeSurvenueData: SirenaLieuDeSurvenueData | null;
}

function resolveMisEnCause(misEnCause: SirecMisEnCause): MisEnCauseResolution {
  if (misEnCause.type === SIREC_TYPE_RPPS) {
    if (!misEnCause.rppsData) {
      throw new SirecDataError(
        `Mis en cause RPPS (id_data=${misEnCause.id_data}, identifiant=${misEnCause.identifiant}) introuvable dans sire_rpps_data`,
      );
    }
    return { misEnCauseData: transformSirecRpps(misEnCause.rppsData), lieuDeSurvenueData: null };
  }

  if (misEnCause.type === SIREC_TYPE_FINESS) {
    if (!misEnCause.finessData) {
      throw new SirecDataError(
        `Mis en cause FINESS (id_data=${misEnCause.id_data}, identifiant=${misEnCause.identifiant}) introuvable dans sire_finess_data`,
      );
    }
    const result: SirenaFinessResult = transformSirecFiness(misEnCause.finessData);
    return { misEnCauseData: result.misEnCauseData, lieuDeSurvenueData: result.lieuDeSurvenueData };
  }

  if (misEnCause.type === SIREC_TYPE_AUTRE) {
    return { misEnCauseData: transformSirecAutre(misEnCause), lieuDeSurvenueData: null };
  }

  return { misEnCauseData: null, lieuDeSurvenueData: null };
}

export function transformSirecMisEnCauseSituations(
  sirecData: SirecReclamationData,
  situationEntiteIds: string[],
): SirenaSituationData[] {
  const { misEnCauses, reclamation, groupIds } = sirecData;

  if (misEnCauses.length === 0) {
    const sansMcData = resolveSansMc(reclamation.sans_mc);
    const baseSituationNoMec = transformSirecSituation(sirecData, situationEntiteIds);
    return [{ ...baseSituationNoMec, misEnCauseData: applyObservation(sansMcData, reclamation.observation) }];
  }

  const baseSituation = transformSirecSituation(sirecData, []);

  const allMisEnCauseGroupIds = new Set(misEnCauses.flatMap((m) => m.groupIds));
  const orphanGroupIds = groupIds.filter((id) => !allMisEnCauseGroupIds.has(id));

  const orphanEntiteIds = computeSituationEntiteIds([
    reclamation.service_recepteur_niv1,
    reclamation.service_gestionnaire,
    ...orphanGroupIds,
  ]);

  return misEnCauses.map((misEnCause) => {
    const misEnCauseEntiteIds = computeSituationEntiteIds(misEnCause.groupIds);
    const entiteIds = [...new Set([...orphanEntiteIds, ...misEnCauseEntiteIds])];
    const { misEnCauseData, lieuDeSurvenueData } = resolveMisEnCause(misEnCause);
    return {
      ...baseSituation,
      entiteIds,
      misEnCauseData: applyObservation(misEnCauseData, reclamation.observation),
      lieuDeSurvenueData,
    };
  });
}
