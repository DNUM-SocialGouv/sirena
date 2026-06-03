import { MIS_EN_CAUSE_ETABLISSEMENT_PRECISION, MIS_EN_CAUSE_TYPE } from '@sirena/common/constants';
import type { SirecFinessData } from '../sirecMigration.repository.js';
import { transcodeFinessCategetab } from '../transco/finessCategetab.transco.js';
import { SirecDataError } from '../transco/sirecTransco.error.js';

export interface SirenaFinessMisEnCauseData {
  kind: 'finess';
  finess: string;
  misEnCauseTypeId: string;
  misEnCauseTypePrecisionId: string;
  nomService: string;
  codePostal: string | null;
  ville: string | null;
}

export interface SirenaLieuDeSurvenueData {
  finess: string;
  codePostal: string;
  categCode: string;
  categLib: string;
  lieuTypeId: string;
  adresse: {
    label: string;
    numero: string;
    rue: string;
    codePostal: string;
    ville: string;
  };
}

export interface SirenaFinessResult {
  misEnCauseData: SirenaFinessMisEnCauseData;
  lieuDeSurvenueData: SirenaLieuDeSurvenueData | null;
}

export function transformSirecFiness(finessData: SirecFinessData): SirenaFinessResult {
  if (!finessData.nofinesset) {
    throw new SirecDataError(`Mis en cause FINESS (id_data=${finessData.id_data}) : nofinesset est null`);
  }

  const entry = transcodeFinessCategetab(finessData.categetab);

  const misEnCauseData: SirenaFinessMisEnCauseData = {
    kind: 'finess',
    finess: finessData.nofinesset,
    misEnCauseTypeId: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
    misEnCauseTypePrecisionId:
      entry.kind === 'mec' ? entry.mecPrecisionId : MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.ETABLISSEMENT,
    nomService: finessData.rs ?? '',
    codePostal: finessData.codepostal,
    ville: finessData.libcommune,
  };

  if (entry.kind === 'mec') {
    return { misEnCauseData, lieuDeSurvenueData: null };
  }

  return {
    misEnCauseData,
    lieuDeSurvenueData: {
      finess: finessData.nofinesset,
      codePostal: finessData.codepostal ?? '',
      categCode: String(finessData.categetab ?? ''),
      categLib: finessData.libcategetab ?? '',
      lieuTypeId: entry.lieuTypeId,
      adresse: {
        label: finessData.rs ?? '',
        numero: finessData.numvoie !== null ? String(finessData.numvoie) : '',
        rue: `${finessData.typevoie ?? ''} ${finessData.voie ?? ''}`.trim(),
        codePostal: finessData.codepostal ?? '',
        ville: finessData.libcommune ?? '',
      },
    },
  };
}
