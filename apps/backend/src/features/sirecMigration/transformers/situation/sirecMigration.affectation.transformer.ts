import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import {
  SIREC_GROUP_MODE,
  SIREC_NATIONAL_ENTITE_ID,
  type SirecGroupMode,
  transcodeAffectation,
} from '../../transco/affectation/affectation.transco.js';
import { SirecDataError } from '../../transco/sirecTransco.error.js';

export interface SirenaAffectationData {
  requeteEntiteIds: string[];
  situationEntiteIds: string[];
}

export function transformSirecAffectation(sirecData: SirecReclamationData): SirenaAffectationData {
  const requeteIds = new Set<string>();
  const situationIds = new Set<string>();

  const allEntries: { fieldValue: number | null; mode: SirecGroupMode }[] = [
    { fieldValue: sirecData.reclamation.service_gestionnaire, mode: SIREC_GROUP_MODE.ECRITURE },
    ...sirecData.groupIds.map((g) => ({ fieldValue: g.id_group, mode: g.mode })),
  ];

  for (const { fieldValue, mode } of allEntries) {
    if (!fieldValue || fieldValue === SIREC_NATIONAL_ENTITE_ID) continue;

    const { requeteEntiteIds, situationEntiteIds } = transcodeAffectation(fieldValue, mode);
    for (const id of requeteEntiteIds) requeteIds.add(id);
    for (const id of situationEntiteIds) situationIds.add(id);
  }

  if (requeteIds.size === 0) {
    throw new SirecDataError(`Aucun service ou ARS affecté à la réclamation SIREC ${sirecData.reclamation.id_data}`);
  }

  return {
    requeteEntiteIds: [...requeteIds],
    situationEntiteIds: [...situationIds],
  };
}
