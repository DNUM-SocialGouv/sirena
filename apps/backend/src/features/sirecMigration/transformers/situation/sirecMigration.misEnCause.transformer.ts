import type { SirecMisEnCause, SirecReclamationData, SirecReclamationRow } from '../../sirecMigration.repository.js';
import { SIREC_NATIONAL_ENTITE_ID } from '../../transco/affectation/affectation.transco.js';
import { SIREC_BOOLEAN_TRANSCO } from '../../transco/dictionnaire.transco.js';
import { SIREC_TYPE_FINESS } from '../../transco/finessCategetab.transco.js';
import { SIREC_TYPE_AUTRE } from '../../transco/misEnCauseAutre.transco.js';
import { SIREC_TYPE_RPPS } from '../../transco/misEnCauseRpps.transco.js';
import { transcodeSignalement } from '../../transco/signalement.transco.js';
import { SirecDataError, SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { computeSituationEntiteIds } from './sirecMigration.affectation.transformer.js';
import { transformSirecAutre } from './sirecMigration.autre.transformer.js';
import {
  type SirenaFinessResult,
  type SirenaLieuDeSurvenueData,
  transformSirecFiness,
} from './sirecMigration.finess.transformer.js';
import { resolveMotifsIgas } from './sirecMigration.motifsIgas.transformer.js';
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

function appendAutrePrecision(data: SirenaMisEnCauseData | null, suffix: string | null): SirenaMisEnCauseData | null {
  if (!suffix || data === null) return data;
  return { ...data, autrePrecision: data.autrePrecision ? `${data.autrePrecision}\n${suffix}` : suffix };
}

function applyMisEnCauseAnnotations(
  data: SirenaMisEnCauseData | null,
  reclamation: SirecReclamationRow,
): SirenaMisEnCauseData | null {
  const withObservation = appendAutrePrecision(
    data,
    reclamation.observation ? `Observations : ${reclamation.observation}` : null,
  );
  return transcodeSignalement(reclamation.signalement) === true
    ? appendAutrePrecision(withObservation, 'Enregistré en tant que Signalement dans SIREC')
    : withObservation;
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
    return [{ ...baseSituationNoMec, misEnCauseData: applyMisEnCauseAnnotations(sansMcData, reclamation) }];
  }

  const baseSituation = transformSirecSituation(sirecData, []);

  const allMisEnCauseGroupIds = new Set(misEnCauses.flatMap((m) => m.groupIds));
  const orphanGroupIds = groupIds.filter((id) => !allMisEnCauseGroupIds.has(id));

  const orphanEntiteIds = computeSituationEntiteIds([
    ...[reclamation.service_recepteur_niv1, reclamation.service_gestionnaire].filter(
      (id) => id !== SIREC_NATIONAL_ENTITE_ID,
    ),
    ...orphanGroupIds,
  ]);

  return misEnCauses.map((misEnCause) => {
    const misEnCauseEntiteIds = computeSituationEntiteIds(misEnCause.groupIds);
    const entiteIds = [...new Set([...orphanEntiteIds, ...misEnCauseEntiteIds])];
    const { misEnCauseData, lieuDeSurvenueData } = resolveMisEnCause(misEnCause);
    const { motifs, commentaireSuffix } = resolveMotifsIgas(misEnCause.motifsIgas);
    return {
      ...baseSituation,
      entiteIds,
      misEnCauseData: applyMisEnCauseAnnotations(misEnCauseData, reclamation),
      lieuDeSurvenueData,
      fait: {
        ...baseSituation.fait,
        motifs,
        commentaire: commentaireSuffix
          ? [baseSituation.fait.commentaire, commentaireSuffix].filter(Boolean).join('\n')
          : baseSituation.fait.commentaire,
      },
    };
  });
}
