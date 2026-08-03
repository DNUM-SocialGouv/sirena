import { MOTIF } from '@sirena/common/constants';
import { SirecTranscoError } from './sirecTransco.error.js';

const MOTIFS_DECLARATIFS_TRANSCO: Record<number, string> = {
  823: MOTIF.AUTRE,
  815: MOTIF.AUTRE,
  813: MOTIF.PROBLEME_INFORMATION,
  821: MOTIF.PROBLEME_QUALITE_SOINS,
  819: MOTIF.AUTRE,
  807: MOTIF.AUTRE,
  809: MOTIF.PROBLEME_FACTURATION,
  811: MOTIF.PROBLEME_LOCAUX,
  817: MOTIF.PROBLEME_COMPORTEMENTAL,
};

export function transcodeMotifsDeclaratifs(idDicos: number[]): string[] {
  return idDicos.map((idDico) => {
    const motifId = MOTIFS_DECLARATIFS_TRANSCO[idDico];
    if (motifId === undefined) {
      throw new SirecTranscoError(idDico, 'motifsDeclaratifs');
    }
    return motifId;
  });
}
