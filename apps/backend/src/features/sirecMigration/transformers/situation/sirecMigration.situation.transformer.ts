import { DEMARCHES_ENGAGEES, REPONSE_OUI_NON } from '@sirena/common/constants';
import type { ReponseOuiNonValue } from '@sirena/common/schemas';
import { booleanToReponseOuiNon } from '@sirena/common/utils';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SIREC_BOOLEAN_TRANSCO } from '../../transco/dictionnaire.transco.js';
import { transcodeDomaineFonctionnel } from '../../transco/domaineFonctionnel.transco.js';
import { transcodeSimpleField } from '../../transco/simpleField.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
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
  domainesFonctionnelsId: string | null;
  estLieAuSignalement: ReponseOuiNonValue;
  numerosSignalement: string;
  sirecDepartement: string | null;
}

const SAISINE_PLAINTE = 75;

function resolveEstLieAuSignalement(ei_avere: number | null, num_sign_assoc: string | null): ReponseOuiNonValue {
  let eiAvere: boolean | undefined;
  if (ei_avere !== null && ei_avere !== 77) {
    const value = SIREC_BOOLEAN_TRANSCO[ei_avere];
    if (value === undefined) throw new SirecTranscoError(ei_avere, 'ei_avere');
    eiAvere = value;
  }
  if (eiAvere || num_sign_assoc) return REPONSE_OUI_NON.OUI;
  return booleanToReponseOuiNon(eiAvere) ?? undefined;
}

export function transformSirecSituation(sirecData: SirecReclamationData, entiteIds: string[]): SirenaSituationData {
  const { saisine, ei_avere, num_sign_assoc } = sirecData.reclamation;
  const demarchesIds = saisine === SAISINE_PLAINTE ? [DEMARCHES_ENGAGEES.PLAINTE] : [];

  return {
    fait: transformSirecFait(sirecData),
    entiteIds,
    demarchesIds,
    misEnCauseData: null,
    lieuDeSurvenueData: null,
    domainesFonctionnelsId: transcodeDomaineFonctionnel(sirecData.reclamation.domaine),
    estLieAuSignalement: resolveEstLieAuSignalement(ei_avere, num_sign_assoc),
    numerosSignalement: num_sign_assoc ?? '',
    sirecDepartement: transcodeSimpleField(sirecData.reclamation.departement, 'departement'),
  };
}
