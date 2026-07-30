import type { SirecMisEnCause, SirecReclamationData, SirecReclamationRow } from '../../sirecMigration.repository.js';
import { ARS_NORMANDIE_ENTITE_ID, SIREC_NATIONAL_ENTITE_ID } from '../../transco/affectation/affectation.transco.js';
import { SIREC_BOOLEAN_TRANSCO, SIREC_DICO } from '../../transco/dictionnaire.transco.js';
import { SIREC_TYPE_FINESS } from '../../transco/finessCategetab.transco.js';
import { SIREC_TYPE_AUTRE } from '../../transco/misEnCauseAutre.transco.js';
import { SIREC_TYPE_RPPS } from '../../transco/misEnCauseRpps.transco.js';
import { transcodeSignalement } from '../../transco/signalement.transco.js';
import { SirecDataError, SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaDeclarantData } from '../sirecMigration.declarant.transformer.js';
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

function transcodeServiceConcerne(idDico: number): string {
  const label = SIREC_DICO[idDico];
  if (label === undefined) throw new SirecTranscoError(idDico, 'service_concerne');
  return label;
}

function transcodePublicConcerne(idDico: number): string {
  const label = SIREC_DICO[idDico];
  if (label === undefined) throw new SirecTranscoError(idDico, 'public_concerne');
  return label;
}

function buildSirecAnnotations(reclamation: SirecReclamationRow, misEnCause?: SirecMisEnCause): string {
  return [
    misEnCause?.serviceConcerne != null
      ? `Service concerné : ${transcodeServiceConcerne(misEnCause.serviceConcerne)}`
      : null,
    misEnCause?.publicConcerne != null
      ? `Public concerné : ${transcodePublicConcerne(misEnCause.publicConcerne)}`
      : null,
    reclamation.observation ? `Observations : ${reclamation.observation}` : null,
    transcodeSignalement(reclamation.signalement) === true ? 'Enregistré en tant que Signalement dans SIREC' : null,
  ]
    .filter((part): part is string => part !== null)
    .join('\n');
}

function applyMisEnCauseAnnotations(
  data: SirenaMisEnCauseData | null,
  annotations: string,
): SirenaMisEnCauseData | null {
  if (data === null || !annotations) return data;
  return { ...data, autrePrecision: data.autrePrecision ? `${data.autrePrecision}\n${annotations}` : annotations };
}

// When a SIREC "autre" value maps to a lieu (no mis en cause), keep its SIREC notes on the lieu.
function applyLieuAnnotations(
  data: SirenaLieuDeSurvenueData | null,
  annotations: string,
): SirenaLieuDeSurvenueData | null {
  if (data === null || !annotations) return data;
  return { ...data, commentaire: data.commentaire ? `${data.commentaire}\n${annotations}` : annotations };
}

function shouldClearMisEnCauseType(
  requeteEntiteIds: string[],
  declarant: SirenaDeclarantData | null,
  signalement: number | null,
  lieuDeSurvenueData: SirenaLieuDeSurvenueData | null,
): boolean {
  return (
    requeteEntiteIds.includes(ARS_NORMANDIE_ENTITE_ID) &&
    transcodeSignalement(signalement) === true &&
    declarant === null &&
    lieuDeSurvenueData !== null
  );
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
    return transformSirecAutre(misEnCause);
  }

  return { misEnCauseData: null, lieuDeSurvenueData: null };
}

export function transformSirecMisEnCauseSituations(
  sirecData: SirecReclamationData,
  situationEntiteIds: string[],
  requeteEntiteIds: string[] = [],
  declarant: SirenaDeclarantData | null = null,
): SirenaSituationData[] {
  const { misEnCauses, reclamation, groupIds } = sirecData;

  if (misEnCauses.length === 0) {
    const sansMcData = resolveSansMc(reclamation.sans_mc);
    const baseSituationNoMec = transformSirecSituation(sirecData, situationEntiteIds);
    // Built even without a mis en cause so an unknown signalement value still fails fast.
    const annotations = buildSirecAnnotations(reclamation);
    return [{ ...baseSituationNoMec, misEnCauseData: applyMisEnCauseAnnotations(sansMcData, annotations) }];
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
    // Built once (also validates the signalement value); routed to the mis en cause,
    // or to the lieu when the SIREC record maps to a lieu (no mis en cause).
    const annotations = buildSirecAnnotations(reclamation, misEnCause);
    const annotatedMisEnCauseData = applyMisEnCauseAnnotations(misEnCauseData, annotations);
    const annotatedLieuData =
      misEnCauseData === null ? applyLieuAnnotations(lieuDeSurvenueData, annotations) : lieuDeSurvenueData;
    const finalMisEnCauseData =
      annotatedMisEnCauseData &&
      shouldClearMisEnCauseType(requeteEntiteIds, declarant, reclamation.signalement, lieuDeSurvenueData)
        ? { ...annotatedMisEnCauseData, misEnCauseTypeId: null, misEnCauseTypePrecisionId: null }
        : annotatedMisEnCauseData;
    return {
      ...baseSituation,
      entiteIds,
      misEnCauseData: finalMisEnCauseData,
      lieuDeSurvenueData: annotatedLieuData,
      fait: {
        ...baseSituation.fait,
        motifs,
        commentaire: commentaireSuffix ? commentaireSuffix : undefined,
      },
    };
  });
}
