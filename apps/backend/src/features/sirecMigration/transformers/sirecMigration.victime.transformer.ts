import type { SirecReclamationRow } from '../sirecMigration.repository.js';
import type { SirenaIdentiteData } from './sirecMigration.identite.transformer.js';

export interface SirenaVictimeData {
  identite: SirenaIdentiteData | null;
  commentaire: string;
}

export function transformSirecVictime(reclamation: SirecReclamationRow): SirenaVictimeData | null {
  const { victime_non_identifiee } = reclamation;

  const victimeCommentaireParts = [victime_non_identifiee === 1 ? 'Usager (Victime) non identifié : oui' : null].filter(
    Boolean,
  ) as string[];

  const commentaire = victimeCommentaireParts.join('\n');
  const hasVictimeData = commentaire !== '';

  return hasVictimeData ? { identite: null, commentaire } : null;
}
