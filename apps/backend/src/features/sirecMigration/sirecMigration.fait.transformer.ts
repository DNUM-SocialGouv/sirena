import type { SirecReclamationData } from './sirecMigration.repository.js';
import { transcodeMotifsDeclaratifs } from './transco/motifsDeclaratifs.transco.js';

export interface SirenaFaitData {
  commentaire: string;
  autresPrecisions: string;
  motifsDeclaratifs: string[];
}

export function transformSirecFait(sirecData: SirecReclamationData): SirenaFaitData {
  return {
    commentaire: sirecData.reclamation.prioritaire_precisez ?? '',
    autresPrecisions: sirecData.reclamation.description ?? '',
    motifsDeclaratifs: transcodeMotifsDeclaratifs(sirecData.motifsDeclaresIdDicos),
  };
}
