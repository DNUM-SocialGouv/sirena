import { SirecTranscoError } from './sirecTransco.error.js';

const PLAIGNANT_TRANSCO: Record<number, boolean> = {
  34: true,
  36: false,
};

export function transcodePlaignant(idSirec: number | null): boolean | null {
  if (idSirec === null) return null;
  const result = PLAIGNANT_TRANSCO[idSirec];
  if (result === undefined) throw new SirecTranscoError(idSirec, 'plaignant');
  return result;
}
