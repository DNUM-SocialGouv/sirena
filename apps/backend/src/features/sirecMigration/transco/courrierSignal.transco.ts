import { SIREC_DICO } from './dictionnaire.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

export function transcodeCourrierSignal(idSirec: number | null): string | null {
  if (idSirec === null) return null;
  const label = SIREC_DICO[idSirec];
  if (label === undefined) throw new SirecTranscoError(idSirec, 'courrierSignal');
  return label;
}
