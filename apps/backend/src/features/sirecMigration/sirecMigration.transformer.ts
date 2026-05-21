import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { generateSirenaIdFromSirecReclamation } from '../../helpers/sirecMigration.js';
import { transformSirecAffectation } from './sirecMigration.affectation.transformer.js';
import type { SirecReclamationData } from './sirecMigration.repository.js';
import { type SirenaSituationData, transformSirecSituation } from './sirecMigration.situation.transformer.js';
import { transcodeDeclarant } from './transco/declarant.transco.js';
import { transcodeReceptionType } from './transco/receptionType.transco.js';

export type { SirenaSituationData };

export interface SirenaDeclarantData {
  estVictime: boolean | null;
  commentaire: string;
}

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  receptionTypeId: string | null;
  prioriteId: string | null;
  declarant: SirenaDeclarantData | null;
  requeteEntiteIds: string[];
  situation: SirenaSituationData;
}

export function transformSirecReclamation(sirecData: SirecReclamationData): SirenaRequeteData {
  const { requeteEntiteIds, situationEntiteIds } = transformSirecAffectation(sirecData);
  const estVictime = transcodeDeclarant(sirecData.reclamation.plaignant);
  const declarantCommentaireParts = [
    sirecData.reclamation.plaignant_est_anonyme === 1 ? 'Le requérant est anonyme : oui' : null,
  ].filter(Boolean) as string[];
  const declarantCommentaire = declarantCommentaireParts.join('\n');
  const hasDeclarantData = estVictime !== null || declarantCommentaire !== '';

  return {
    sirenaId: generateSirenaIdFromSirecReclamation(sirecData.reclamation),
    sirecId: sirecData.reclamation.id_data,
    receptionDate: sirecData.reclamation.r_recept_date,
    receptionTypeId: transcodeReceptionType(sirecData.reclamation.reception),
    prioriteId: sirecData.reclamation.prioritaire === 1 ? REQUETE_PRIORITE_TYPES.HAUTE : null,
    declarant: hasDeclarantData ? { estVictime, commentaire: declarantCommentaire } : null,
    requeteEntiteIds,
    situation: transformSirecSituation(sirecData, situationEntiteIds),
  };
}
