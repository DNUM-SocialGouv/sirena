import { SIREC_DICO } from './dictionnaire.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

export function transcodeSimpleField(idSirec: number | null, tableName: string): string | null {
  if (idSirec === null) return null;
  const label = SIREC_DICO[idSirec];
  if (label === undefined) throw new SirecTranscoError(idSirec, tableName);
  return label;
}
