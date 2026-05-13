import type { SirecReclamationData } from './sirecMigration.repository.js';
import { transcodeMotifsDeclaratifs } from './transco/motifsDeclaratifs.transco.js';

export interface SirenaFaitData {
  autresPrecisions: string;
  motifsDeclaratifs: string[];
}

export function transformSirecFait(sirecData: SirecReclamationData): SirenaFaitData {
  return {
    autresPrecisions: sirecData.reclamation.description ?? '',
    motifsDeclaratifs: transcodeMotifsDeclaratifs(sirecData.motifsDeclaresIdDicos),
  };
}
