import { REPONSE_OUI_NON, reponseOuiNonLabels } from '../constants/reponseOuiNon.constant.js';
import type { ReponseOuiNon, ReponseOuiNonValue } from '../schemas/index.js';

export const REPONSE_NON_RENSEIGNE_LABEL = reponseOuiNonLabels[REPONSE_OUI_NON.NON_RENSEIGNE];

export const formatReponseOuiNon = (reponse: ReponseOuiNonValue): string | null =>
  reponse ? reponseOuiNonLabels[reponse] : null;

export const reponseOuiNonToBoolean = (reponse: ReponseOuiNonValue): boolean | null => {
  if (reponse === REPONSE_OUI_NON.OUI) return true;
  if (reponse === REPONSE_OUI_NON.NON) return false;
  return null;
};

export const booleanToReponseOuiNon = (value: boolean | null | undefined): ReponseOuiNon | null => {
  if (value === true) return REPONSE_OUI_NON.OUI;
  if (value === false) return REPONSE_OUI_NON.NON;
  return null;
};

export const negateReponseOuiNon = (reponse: ReponseOuiNonValue): ReponseOuiNon | null => {
  if (reponse === REPONSE_OUI_NON.OUI) return REPONSE_OUI_NON.NON;
  if (reponse === REPONSE_OUI_NON.NON) return REPONSE_OUI_NON.OUI;
  return reponse ?? null;
};

export const isReponseOuiNonRenseignee = (reponse: ReponseOuiNonValue): boolean =>
  reponse === REPONSE_OUI_NON.OUI || reponse === REPONSE_OUI_NON.NON;
