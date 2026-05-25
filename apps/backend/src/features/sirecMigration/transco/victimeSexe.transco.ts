import { CIVILITE } from '@sirena/common/constants';
import { SirecTranscoError } from './sirecTransco.error.js';

const VICTIME_SEXE_TRANSCO: Record<number, string> = {
  38: CIVILITE.M,
  40: CIVILITE.MME,
};

export function transcodeVictimeSexe(idSirec: number | null): string | null {
  if (idSirec === null) return null;
  const result = VICTIME_SEXE_TRANSCO[idSirec];
  if (result === undefined) throw new SirecTranscoError(idSirec, 'victimeSexe');
  return result;
}
