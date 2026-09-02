import { motifCategoriesById, motifLabelsById } from '@sirena/common/constants';
import type { SirecMcIgasMotif } from '../../sirecMigration.repository.js';
import { getParentMotifIgasId, transcodeMotifIgas } from '../../transco/motifsIgas.transco.js';

export interface MotifsIgasResolution {
  motifs: string[];
  commentaireSuffix: string | null;
}

const ENTREE_COMMENTAIRE_PREFIX = "Motifs IGAS d'entrée :";

// Si un motif Igas parent et un de ses motifs enfants sont tous les deux présents (pour un même
// igas_type), le motif parent est ignoré : seuls le ou les motifs enfants sont migrés.
function excludeParentsWithChildren(idIgasList: number[]): number[] {
  const parentIdsWithAChildPresent = new Set(
    idIgasList
      .map((idIgas) => getParentMotifIgasId(idIgas))
      .filter((parentId): parentId is number => parentId !== undefined),
  );
  return idIgasList.filter((idIgas) => !parentIdsWithAChildPresent.has(idIgas));
}

function transcodeUnique(motifsIgas: SirecMcIgasMotif[], igasType: 'in' | 'out'): string[] {
  const idIgasList = motifsIgas
    .filter((motifIgas) => motifIgas.igas_type === igasType)
    .map((motifIgas) => motifIgas.id_igas);

  return [...new Set(excludeParentsWithChildren(idIgasList).flatMap((idIgas) => transcodeMotifIgas(idIgas)))];
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
