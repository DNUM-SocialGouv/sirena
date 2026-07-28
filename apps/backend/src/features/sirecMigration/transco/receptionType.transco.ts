import { RECEPTION_TYPE } from '@sirena/common/constants';
import { SirecTranscoError } from './sirecTransco.error.js';

const RECEPTION_TYPE_TRANSCO: Record<number, string> = {
  10: RECEPTION_TYPE.COURRIER,
  12: RECEPTION_TYPE.EMAIL,
  14: RECEPTION_TYPE.TELEPHONE,
  89: RECEPTION_TYPE.INFO_MEDIA,
  338: RECEPTION_TYPE.PORTAIL_SIGNALEMENTS,
  340: RECEPTION_TYPE.AUTRE,
  803: RECEPTION_TYPE.FORMULAIRE,
  825: RECEPTION_TYPE.SIGNAL_CONSO,
};

export function transcodeReceptionType(idSirec: number | null): string | null {
  if (idSirec === null) return null;
  const receptionTypeId = RECEPTION_TYPE_TRANSCO[idSirec];
  if (receptionTypeId === undefined) throw new SirecTranscoError(idSirec, 'receptionType');
  return receptionTypeId;
}
