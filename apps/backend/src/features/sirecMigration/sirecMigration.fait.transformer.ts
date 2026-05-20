import type { SirecReclamationData } from './sirecMigration.repository.js';
import { transcodeDest } from './transco/dest.transco.js';
import { transcodeMotifsDeclaratifs } from './transco/motifsDeclaratifs.transco.js';

export interface SirenaFaitData {
  commentaire: string;
  autresPrecisions: string;
  motifsDeclaratifs: string[];
}

export function transformSirecFait(sirecData: SirecReclamationData): SirenaFaitData {
  const destLabel = transcodeDest(sirecData.reclamation.dest);
  const commentaireParts = [
    sirecData.reclamation.prioritaire_precisez,
    destLabel ? `Destinataire(s) de la réclamation : ${destLabel}` : null,
  ].filter(Boolean) as string[];

  return {
    commentaire: commentaireParts.join('\n'),
    autresPrecisions: sirecData.reclamation.description ?? '',
    motifsDeclaratifs: transcodeMotifsDeclaratifs(sirecData.motifsDeclaresIdDicos),
  };
}
