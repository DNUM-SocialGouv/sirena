import { SirecTranscoError } from './sirecTransco.error.js';

const DECLARANT_TRANSCO: Record<number, boolean> = {
  34: true,
  36: false,
};

export function transcodeDeclarant(idSirec: number | null): boolean | null {
  if (idSirec === null) return null;
  const result = DECLARANT_TRANSCO[idSirec];
  if (result === undefined) throw new SirecTranscoError(idSirec, 'declarant');
  return result;
}
