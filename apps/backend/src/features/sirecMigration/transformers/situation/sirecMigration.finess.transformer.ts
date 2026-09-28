import type { SirecFinessData } from '../../sirecMigration.repository.js';
import { transcodeFinessCategetab } from '../../transco/finessCategetab.transco.js';
import { SirecDataError } from '../../transco/sirecTransco.error.js';

export interface SirenaFinessMisEnCauseData {
  kind: 'finess';
  misEnCauseTypeId: string | null;
  misEnCauseTypePrecisionId: string | null;
  finess?: string;
  nomService?: string;
  codePostal?: string | null;
  ville?: string | null;
  autrePrecision?: string;
}

export interface SirenaLieuDeSurvenueData {
  finess?: string;
  codePostal?: string;
  categCode?: string;
  categLib?: string;
  lieuTypeId: string;
  lieuPrecision?: string;
  adresse?: {
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

// Lignes SIREC dont le nofinesset est absent ou mal renseigné en base : correction manuelle par id_data.
const FINESS_CORRECTIONS_BY_ID_DATA: Record<number, string> = {
  185334: '590034740',
  245214: '450000286',
  170084: '390780146',
  141822: '060780608',
  206675: '790000392',
};

export function transformSirecFiness(finessData: SirecFinessData): SirenaFinessResult {
  const nofinesset = finessData.nofinesset ?? FINESS_CORRECTIONS_BY_ID_DATA[finessData.id_data];
  if (!nofinesset) {
    throw new SirecDataError(`Mis en cause FINESS (id_data=${finessData.id_data}) : nofinesset est null`);
  }

  const entry = transcodeFinessCategetab(finessData.categetab);

  const misEnCauseData: SirenaFinessMisEnCauseData = {
    kind: 'finess',
    misEnCauseTypeId: entry.misEnCause.misEnCauseTypeId,
    misEnCauseTypePrecisionId: entry.misEnCause.misEnCauseTypePrecisionId,
    ...(entry.lieuSurvenue === undefined && {
      finess: nofinesset,
      nomService: finessData.rs ?? '',
      codePostal: finessData.codepostal,
      ville: finessData.libcommune,
    }),
  };

  if (entry.lieuSurvenue === undefined) {
    return { misEnCauseData, lieuDeSurvenueData: null };
  }

  return {
    misEnCauseData,
    lieuDeSurvenueData: {
      finess: nofinesset,
      codePostal: finessData.codepostal ?? '',
      categCode: String(finessData.categetab ?? ''),
      categLib: finessData.libcategetab ?? '',
      lieuTypeId: entry.lieuSurvenue.lieuTypeId,
      lieuPrecision: entry.lieuSurvenue.lieuPrecision,
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
