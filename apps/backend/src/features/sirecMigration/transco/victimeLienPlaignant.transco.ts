import { LIEN_VICTIME } from '@sirena/common/constants';
import { SirecTranscoError } from './sirecTransco.error.js';

const VICTIME_LIEN_PLAIGNANT_TRANSCO: Record<number, string> = {
  46: LIEN_VICTIME.MEMBRE_FAMILLE,
  107: LIEN_VICTIME.AUTRE,
};

export function transcodeVictimeLienPlaignant(idSirec: number | null): string | null {
  if (idSirec === null) return null;
  const result = VICTIME_LIEN_PLAIGNANT_TRANSCO[idSirec];
  if (result === undefined) throw new SirecTranscoError(idSirec, 'victimeLienPlaignant');
  return result;
}
