import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { generateSirenaIdFromSirecReclamation } from '../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { filterArsEntiteIds } from '../transco/affectation.transco.js';
import { transcodeReceptionType } from '../transco/receptionType.transco.js';
import { SirecDataError } from '../transco/sirecTransco.error.js';
import {
  type SirenaAccuseReceptionEtapeData,
  transformSirecAccuseReception,
} from './sirecMigration.accuseReception.transformer.js';
import { transformSirecAffectation } from './sirecMigration.affectation.transformer.js';
import { type SirenaDeclarantData, transformSirecDeclarant } from './sirecMigration.declarant.transformer.js';
import { type SirenaProvenanceData, transformSirecProvenances } from './sirecMigration.provenance.transformer.js';
import { type SirenaSituationData, transformSirecSituation } from './sirecMigration.situation.transformer.js';
import { type SirenaVictimeData, transformSirecVictime } from './sirecMigration.victime.transformer.js';

export type { SirenaAdresseData } from './sirecMigration.declarant.transformer.js';
export type {
  SirenaAccuseReceptionEtapeData,
  SirenaDeclarantData,
  SirenaProvenanceData,
  SirenaSituationData,
  SirenaVictimeData,
};

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  receptionTypeId: string | null;
  prioriteId: string | null;
  declarant: SirenaDeclarantData | null;
  victime: SirenaVictimeData | null;
  requeteEntiteIds: string[];
  provenances: SirenaProvenanceData[];
  accuseReceptionEtapes: SirenaAccuseReceptionEtapeData[];
  situation: SirenaSituationData;
}

export function transformSirecReclamation(sirecData: SirecReclamationData): SirenaRequeteData {
  const { requeteEntiteIds, situationEntiteIds } = transformSirecAffectation(sirecData);
  const arsEntiteIds = filterArsEntiteIds(requeteEntiteIds);
  const provenances = transformSirecProvenances(sirecData);
  const declarant = transformSirecDeclarant(sirecData.reclamation);
  const victime = transformSirecVictime(sirecData.reclamation);

  for (const provenance of provenances) {
    if (!requeteEntiteIds.includes(provenance.entiteId)) {
      throw new SirecDataError(
        `L'entité de la provenance "${provenance.nom}" (id ${provenance.entiteId}) n'est pas parmi les entités de la réclamation SIREC ${sirecData.reclamation.id_data}`,
      );
    }
  }

  return {
    sirenaId: generateSirenaIdFromSirecReclamation(sirecData.reclamation),
    sirecId: sirecData.reclamation.id_data,
    receptionDate: sirecData.reclamation.r_recept_date,
    receptionTypeId: transcodeReceptionType(sirecData.reclamation.reception),
    prioriteId: sirecData.reclamation.prioritaire === 1 ? REQUETE_PRIORITE_TYPES.HAUTE : null,
    declarant,
    victime,
    requeteEntiteIds,
    provenances,
    accuseReceptionEtapes: transformSirecAccuseReception(sirecData, arsEntiteIds),
    situation: transformSirecSituation(sirecData, situationEntiteIds),
  };
}
