import { MALTRAITANCE_TYPE, MOTIF } from '@sirena/common/constants';
import { SirecTranscoError } from './sirecTransco.error.js';

// SIREC carries "Maltraitance" as a declared motif (dico 815), but SIRENA treats maltraitance
// as a dedicated field: it is turned into a maltraitance type so it triggers the maltraitance
// tag like DematSocial does, instead of being a plain declared motif.
export const SIREC_MALTRAITANCE_MOTIF_DICO = 815;

const MOTIFS_DECLARATIFS_TRANSCO: Record<number, string> = {
  823: MOTIF.DIFFICULTES_ACCES_SOINS,
  813: MOTIF.PROBLEME_INFORMATION,
  821: MOTIF.PROBLEME_QUALITE_SOINS,
  819: MOTIF.PROBLEME_ORGANISATION_FONCTIONNEMENT,
  807: MOTIF.AUTRE,
  809: MOTIF.PROBLEME_FACTURATION,
  811: MOTIF.PROBLEME_LOCAUX,
  817: MOTIF.PROBLEME_COMPORTEMENTAL,
};

export function transcodeMotifsDeclaratifs(idDicos: number[]): string[] {
  return idDicos
    .filter((idDico) => idDico !== SIREC_MALTRAITANCE_MOTIF_DICO)
    .map((idDico) => {
      const motifId = MOTIFS_DECLARATIFS_TRANSCO[idDico];
      if (motifId === undefined) {
        throw new SirecTranscoError(idDico, 'motifsDeclaratifs');
      }
      return motifId;
    });
}

export function transcodeMaltraitanceTypes(idDicos: number[]): string[] {
  return idDicos.includes(SIREC_MALTRAITANCE_MOTIF_DICO) ? [MALTRAITANCE_TYPE.AUTRE] : [];
}
