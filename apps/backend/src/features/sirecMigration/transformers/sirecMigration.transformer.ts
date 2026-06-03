import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { generateSirenaIdFromSirecReclamation } from '../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { filterArsEntiteIds } from '../transco/affectation.transco.js';
import { transcodeReceptionType } from '../transco/receptionType.transco.js';
import { SirecDataError } from '../transco/sirecTransco.error.js';
import { transformSirecAccuseReception } from './sirecMigration.accuseReception.transformer.js';
import { transformSirecAffectation } from './sirecMigration.affectation.transformer.js';
import { type SirenaDeclarantData, transformSirecDeclarant } from './sirecMigration.declarant.transformer.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';
import { transformSirecExamenCommission } from './sirecMigration.examenCommission.transformer.js';
import { transformSirecInstitutionsPartenaires } from './sirecMigration.institutionPartenaire.transformer.js';
import { transformSirecMisEnCauseSituations } from './sirecMigration.misEnCause.transformer.js';
import { transformSirecPriseEnCharge } from './sirecMigration.priseEnCharge.transformer.js';
import { transformSirecProvenances } from './sirecMigration.provenance.transformer.js';
import { transformSirecReponsePlaignant } from './sirecMigration.reponsePlaignant.transformer.js';
import { transformSirecReponseProvenances } from './sirecMigration.reponseProvenance.transformer.js';
import type { SirenaSituationData } from './sirecMigration.situation.transformer.js';
import { type SirenaVictimeData, transformSirecVictime } from './sirecMigration.victime.transformer.js';

export type { SirenaAdresseData } from './sirecMigration.declarant.transformer.js';
export type { SirenaDeclarantData, SirenaEtapeData, SirenaSituationData, SirenaVictimeData };

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  receptionTypeId: string | null;
  prioriteId: string | null;
  declarant: SirenaDeclarantData | null;
  victime: SirenaVictimeData | null;
  requeteEntiteIds: string[];
  etapes: SirenaEtapeData[];
  situations: SirenaSituationData[];
}

export function transformSirecReclamation(sirecData: SirecReclamationData): SirenaRequeteData {
  const { requeteEntiteIds, situationEntiteIds } = transformSirecAffectation(sirecData);
  const arsEntiteIds = filterArsEntiteIds(requeteEntiteIds);
  const provenanceEtapes = transformSirecProvenances(sirecData);
  const declarant = transformSirecDeclarant(sirecData.reclamation);
  const victime = transformSirecVictime(sirecData.reclamation);

  for (const etape of provenanceEtapes) {
    if (!requeteEntiteIds.includes(etape.entiteId)) {
      throw new SirecDataError(
        `L'entité de la provenance "${etape.nom}" (id ${etape.entiteId}) n'est pas parmi les entités de la réclamation SIREC ${sirecData.reclamation.id_data}`,
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
    etapes: [
      ...provenanceEtapes,
      ...transformSirecReponseProvenances(sirecData),
      ...transformSirecAccuseReception(sirecData, arsEntiteIds),
      ...transformSirecInstitutionsPartenaires(sirecData, arsEntiteIds),
      ...transformSirecPriseEnCharge(sirecData, arsEntiteIds),
      ...transformSirecExamenCommission(sirecData, arsEntiteIds),
      ...transformSirecReponsePlaignant(sirecData, arsEntiteIds),
    ],
    situations: transformSirecMisEnCauseSituations(sirecData, situationEntiteIds),
  };
}
