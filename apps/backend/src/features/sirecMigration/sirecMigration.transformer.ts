import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { generateSirenaIdFromSirecReclamation } from '../../helpers/sirecMigration.js';
import type { SirecReclamationData } from './sirecMigration.repository.js';
import { type SirenaSituationData, transformSirecSituation } from './sirecMigration.situation.transformer.js';
import { transcodeReceptionType } from './transco/receptionType.transco.js';

export type { SirenaSituationData };

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  receptionTypeId: string | null;
  prioriteId: string | null;
  situation: SirenaSituationData;
}

export function transformSirecReclamation(sirecData: SirecReclamationData): SirenaRequeteData {
  return {
    sirenaId: generateSirenaIdFromSirecReclamation(sirecData.reclamation),
    sirecId: sirecData.reclamation.id_data,
    receptionDate: sirecData.reclamation.r_recept_date,
    receptionTypeId: transcodeReceptionType(sirecData.reclamation.reception),
    prioriteId: sirecData.reclamation.prioritaire === 1 ? REQUETE_PRIORITE_TYPES.HAUTE : null,
    situation: transformSirecSituation(sirecData),
  };
}
