import { SirecTranscoError } from './sirecTransco.error.js';

const MOTIFS_DECLARATIFS_TRANSCO: Record<number, string> = {
  823: 'AUTRE',
  815: 'AUTRE',
  813: 'PROBLEME_INFORMATION',
  821: 'PROBLEME_QUALITE_SOINS',
  819: 'AUTRE',
  807: 'AUTRE',
  809: 'PROBLEME_FACTURATION',
  811: 'PROBLEME_LOCAUX',
  817: 'PROBLEME_COMPORTEMENTAL',
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
