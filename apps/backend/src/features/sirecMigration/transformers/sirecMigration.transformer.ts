import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { generateSirenaIdFromSirecReclamation } from '../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { transcodeReceptionType } from '../transco/receptionType.transco.js';
import { transformSirecAffectation } from './sirecMigration.affectation.transformer.js';
import { type SirenaDeclarantData, transformSirecDeclarant } from './sirecMigration.declarant.transformer.js';
import type { SirenaIdentiteData } from './sirecMigration.identite.transformer.js';
import { type SirenaSituationData, transformSirecSituation } from './sirecMigration.situation.transformer.js';

export type { SirenaAdresseData } from './sirecMigration.declarant.transformer.js';
export type { SirenaIdentiteData } from './sirecMigration.identite.transformer.js';
export type { SirenaDeclarantData, SirenaSituationData };

export interface SirenaVictimeData {
  identite: SirenaIdentiteData | null;
}

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  receptionTypeId: string | null;
  prioriteId: string | null;
  declarant: SirenaDeclarantData | null;
  victime: SirenaVictimeData | null;
  requeteEntiteIds: string[];
  situation: SirenaSituationData;
}

export function transformSirecReclamation(sirecData: SirecReclamationData): SirenaRequeteData {
  const { requeteEntiteIds, situationEntiteIds } = transformSirecAffectation(sirecData);
  const declarant = transformSirecDeclarant(sirecData.reclamation);

  return {
    sirenaId: generateSirenaIdFromSirecReclamation(sirecData.reclamation),
    sirecId: sirecData.reclamation.id_data,
    receptionDate: sirecData.reclamation.r_recept_date,
    receptionTypeId: transcodeReceptionType(sirecData.reclamation.reception),
    prioriteId: sirecData.reclamation.prioritaire === 1 ? REQUETE_PRIORITE_TYPES.HAUTE : null,
    declarant,
    victime: declarant?.estVictime === true ? { identite: null } : null,
    requeteEntiteIds,
    situation: transformSirecSituation(sirecData, situationEntiteIds),
  };
}
