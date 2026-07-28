import { MOTIF } from '@sirena/common/constants';
import { SirecTranscoError } from './sirecTransco.error.js';

const MOTIFS_DECLARATIFS_TRANSCO: Record<number, string> = {
  823: MOTIF.DIFFICULTES_ACCES_SOINS,
  815: MOTIF.MALTRAITANCE,
  813: MOTIF.PROBLEME_INFORMATION,
  821: MOTIF.PROBLEME_QUALITE_SOINS,
  819: MOTIF.PROBLEME_ORGANISATION_FONCTIONNEMENT,
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
