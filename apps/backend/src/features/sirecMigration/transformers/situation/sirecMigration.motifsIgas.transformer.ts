import { motifCategoriesById, motifLabelsById } from '@sirena/common/constants';
import type { SirecMcIgasMotif } from '../../sirecMigration.repository.js';
import { transcodeMotifIgas } from '../../transco/motifsIgas.transco.js';

export interface MotifsIgasResolution {
  motifs: string[];
  commentaireSuffix: string | null;
}

const ENTREE_COMMENTAIRE_PREFIX = "Motifs IGAS d'entrée :";

function transcodeUnique(motifsIgas: SirecMcIgasMotif[], igasType: 'in' | 'out'): string[] {
  return [
    ...new Set(
      motifsIgas
        .filter((motifIgas) => motifIgas.igas_type === igasType)
        .flatMap((motifIgas) => transcodeMotifIgas(motifIgas.id_igas)),
    ),
  ];
}

export function resolveMotifsIgas(motifsIgas: SirecMcIgasMotif[]): MotifsIgasResolution {
  const outMotifIds = transcodeUnique(motifsIgas, 'out');
  const inMotifIds = transcodeUnique(motifsIgas, 'in');

  if (outMotifIds.length > 0) {
    const commentaireSuffix =
      inMotifIds.length > 0
        ? [
            ENTREE_COMMENTAIRE_PREFIX,
            ...inMotifIds.map((motifId) => `- ${motifCategoriesById[motifId]} / ${motifLabelsById[motifId]}`),
          ].join('\n')
        : null;
    return { motifs: outMotifIds, commentaireSuffix };
  }

  return { motifs: inMotifIds, commentaireSuffix: null };
}
