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

function appendAutrePrecision(data: SirenaMisEnCauseData | null, suffix: string | null): SirenaMisEnCauseData | null {
  if (!suffix || data === null) return data;
  return { ...data, autrePrecision: data.autrePrecision ? `${data.autrePrecision}\n${suffix}` : suffix };
}

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

function applyMisEnCauseAnnotations(
  data: SirenaMisEnCauseData | null,
  reclamation: SirecReclamationRow,
  misEnCause?: SirecMisEnCause,
): SirenaMisEnCauseData | null {
  const withServiceConcerne = appendAutrePrecision(
    data,
    misEnCause?.serviceConcerne !== null && misEnCause?.serviceConcerne !== undefined
      ? `Service concerné : ${transcodeServiceConcerne(misEnCause.serviceConcerne)}`
      : null,
  );
  const withPublicConcerne = appendAutrePrecision(
    withServiceConcerne,
    misEnCause?.publicConcerne !== null && misEnCause?.publicConcerne !== undefined
      ? `Public concerné : ${transcodePublicConcerne(misEnCause.publicConcerne)}`
      : null,
  );
  const withObservation = appendAutrePrecision(
    withPublicConcerne,
    reclamation.observation ? `Observations : ${reclamation.observation}` : null,
  );
  return transcodeSignalement(reclamation.signalement) === true
    ? appendAutrePrecision(withObservation, 'Enregistré en tant que Signalement dans SIREC')
    : withObservation;
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
    return { misEnCauseData: transformSirecAutre(misEnCause), lieuDeSurvenueData: null };
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
    const annotatedMisEnCauseData = applyMisEnCauseAnnotations(misEnCauseData, reclamation, misEnCause);
    const finalMisEnCauseData =
      annotatedMisEnCauseData &&
      shouldClearMisEnCauseType(requeteEntiteIds, declarant, reclamation.signalement, lieuDeSurvenueData)
        ? { ...annotatedMisEnCauseData, misEnCauseTypeId: null, misEnCauseTypePrecisionId: null }
        : annotatedMisEnCauseData;
    return {
      ...baseSituation,
      entiteIds,
      misEnCauseData: finalMisEnCauseData,
      lieuDeSurvenueData,
      fait: {
        ...baseSituation.fait,
        motifs,
        commentaire: commentaireSuffix ? commentaireSuffix : undefined,
      },
    };
  });
}
