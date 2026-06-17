import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { generateSirenaIdFromSirecReclamation } from '../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { filterArsEntiteIds } from '../transco/affectation/affectation.transco.js';
import { transcodeReceptionType } from '../transco/receptionType.transco.js';
import { transformSirecAccuseReception } from './etapes/sirecMigration.accuseReception.transformer.js';
import { transformSirecCloture } from './etapes/sirecMigration.cloture.transformer.js';
import type { SirenaEtapeData } from './etapes/sirecMigration.etape.types.js';
import { transformSirecExamenCommission } from './etapes/sirecMigration.examenCommission.transformer.js';
import { transformSirecInstitutionsPartenaires } from './etapes/sirecMigration.institutionPartenaire.transformer.js';
import { transformSirecMainCourantes } from './etapes/sirecMigration.mainCourante.transformer.js';
import { transformSirecMesuresPrises } from './etapes/sirecMigration.mesuresPrises.transformer.js';
import { transformSirecPriseEnCharge } from './etapes/sirecMigration.priseEnCharge.transformer.js';
import { transformSirecReceptionProvenances } from './etapes/sirecMigration.receptionProvenance.transformer.js';
import { transformSirecReponsePlaignant } from './etapes/sirecMigration.reponsePlaignant.transformer.js';
import { transformSirecReponseProvenances } from './etapes/sirecMigration.reponseProvenance.transformer.js';
import { type SirenaDeclarantData, transformSirecDeclarant } from './sirecMigration.declarant.transformer.js';
import { type SirenaVictimeData, transformSirecVictime } from './sirecMigration.victime.transformer.js';
import { transformSirecAffectation } from './situation/sirecMigration.affectation.transformer.js';
import { transformSirecMisEnCauseSituations } from './situation/sirecMigration.misEnCause.transformer.js';
import type { SirenaSituationData } from './situation/sirecMigration.situation.transformer.js';

export type { SirenaAdresseData } from './sirecMigration.declarant.transformer.js';
export type { SirenaDeclarantData, SirenaEtapeData, SirenaSituationData, SirenaVictimeData };

export interface SirenaRequeteData {
  sirenaId: string;
  sirecId: number;
  receptionDate: Date | null;
  receptionTypeId: string | null;
  prioriteId: string | null;
  requeteStatutId: string;
  sysLastModDate: Date | null;
  declarant: SirenaDeclarantData | null;
  victime: SirenaVictimeData | null;
  requeteEntiteIds: string[];
  etapes: SirenaEtapeData[];
  situations: SirenaSituationData[];
}

export function transformSirecReclamation(sirecData: SirecReclamationData): SirenaRequeteData {
  const { requeteEntiteIds, situationEntiteIds } = transformSirecAffectation(sirecData);
  const arsEntiteIds = filterArsEntiteIds(requeteEntiteIds);
  const provenanceEtapes = transformSirecReceptionProvenances(sirecData);
  const declarant = transformSirecDeclarant(sirecData.reclamation);
  const victime = transformSirecVictime(sirecData.reclamation);
  const { requeteStatutId, etapes: clotureEtapes } = transformSirecCloture(sirecData, arsEntiteIds);

  return {
    sirenaId: generateSirenaIdFromSirecReclamation(sirecData.reclamation),
    sirecId: sirecData.reclamation.id_data,
    receptionDate: sirecData.reclamation.r_recept_date,
    receptionTypeId: transcodeReceptionType(sirecData.reclamation.reception),
    prioriteId: sirecData.reclamation.prioritaire === 1 ? REQUETE_PRIORITE_TYPES.HAUTE : null,
    requeteStatutId,
    sysLastModDate: sirecData.reclamation.sys_last_mod_date,
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
      ...transformSirecMainCourantes(sirecData),
      ...transformSirecMesuresPrises(sirecData, arsEntiteIds),
      ...clotureEtapes,
    ],
    situations: transformSirecMisEnCauseSituations(sirecData, situationEntiteIds),
  };
}
