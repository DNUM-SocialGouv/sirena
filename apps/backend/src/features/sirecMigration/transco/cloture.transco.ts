import { REQUETE_CLOTURE_REASON } from '@sirena/common/constants';
import { SirecTranscoError } from './sirecTransco.error.js';

const CLOTURE_TRANSCO: Record<number, string> = {
  794: REQUETE_CLOTURE_REASON.AUTRE,
  796: REQUETE_CLOTURE_REASON.ABSENCE_DE_RETOUR,
  116: REQUETE_CLOTURE_REASON.HORS_COMPETENCE,
  802: REQUETE_CLOTURE_REASON.MISSION_D_INSPECTION_ET_CONTROLE,
  798: REQUETE_CLOTURE_REASON.REPONSE_APPORTEE_PAR_SERVICE_INSTRUCTEUR,
  800: REQUETE_CLOTURE_REASON.REPONSE_APPORTEE_PAR_MIS_EN_CAUSE,
  115: REQUETE_CLOTURE_REASON.SANS_SUITE,
};

export function transcodeClotureReason(idSirec: number | null): string | null {
  if (idSirec === null) return null;
  const reason = CLOTURE_TRANSCO[idSirec];
  if (reason === undefined) throw new SirecTranscoError(idSirec, 'typeCloture');
  return reason;
}
