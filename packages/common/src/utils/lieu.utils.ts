import {
  LIEU_TYPE,
  lieuAutresEtablissementsPrecisionLabels,
  lieuDomicilePrecisionLabels,
  lieuEtablissementHandicapPrecisionLabels,
  lieuEtablissementPersonnesAgeesPrecisionLabels,
  lieuEtablissementSantePrecisionLabels,
  lieuEtablissementSocialPrecisionLabels,
  lieuTrajetPrecisionLabels,
} from '../constants/requete.constant.js';

export const lieuPrecisionLabelsByType: Record<string, Record<string, string>> = {
  [LIEU_TYPE.DOMICILE]: lieuDomicilePrecisionLabels,
  [LIEU_TYPE.ETABLISSEMENT_SANTE]: lieuEtablissementSantePrecisionLabels,
  [LIEU_TYPE.ETABLISSEMENT_PERSONNES_AGEES]: lieuEtablissementPersonnesAgeesPrecisionLabels,
  [LIEU_TYPE.ETABLISSEMENT_HANDICAP]: lieuEtablissementHandicapPrecisionLabels,
  [LIEU_TYPE.ETABLISSEMENT_SOCIAL]: lieuEtablissementSocialPrecisionLabels,
  [LIEU_TYPE.AUTRES_ETABLISSEMENTS]: lieuAutresEtablissementsPrecisionLabels,
  [LIEU_TYPE.TRAJET]: lieuTrajetPrecisionLabels,
};

export function getLieuPrecisionLabel(lieuTypeId?: string, lieuPrecision?: string): string {
  if (!lieuPrecision) return '';

  if (!lieuTypeId) return lieuPrecision;

  const labels = lieuPrecisionLabelsByType[lieuTypeId];
  return labels?.[lieuPrecision] || lieuPrecision;
}
