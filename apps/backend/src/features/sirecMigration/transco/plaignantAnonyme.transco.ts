import { SIREC_BOOLEAN_TRANSCO } from './dictionnaire.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

export function transcodePlaignantAnonyme(idSirec: number | null): boolean | null {
  if (idSirec === null) return null;
  const result = SIREC_BOOLEAN_TRANSCO[idSirec];
  if (result === undefined) throw new SirecTranscoError(idSirec, 'plaignantAnonyme');
  return result;
}
