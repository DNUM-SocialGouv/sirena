import { SirecTranscoError } from './sirecTransco.error.js';

const RECEPTION_TYPE_TRANSCO: Record<number, string> = {
  10: 'COURRIER',
  12: 'EMAIL',
  14: 'TELEPHONE',
  89: 'AUTRE',
  338: 'AUTRE',
  340: 'AUTRE',
  803: 'FORMULAIRE',
  825: 'AUTRE',
};

export function transcodeReceptionType(idSirec: number | null): string | null {
  if (idSirec === null) return null;
  const receptionTypeId = RECEPTION_TYPE_TRANSCO[idSirec];
  if (receptionTypeId === undefined) throw new SirecTranscoError(idSirec, 'receptionType');
  return receptionTypeId;
}
