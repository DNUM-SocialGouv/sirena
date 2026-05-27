import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { transcodeAffectation } from '../transco/affectation.transco.js';
import { SirecDataError } from '../transco/sirecTransco.error.js';

export interface SirenaAffectationData {
  requeteEntiteIds: string[];
  situationEntiteIds: string[];
}

export function transformSirecAffectation(sirecData: SirecReclamationData): SirenaAffectationData {
  const requeteIds = new Set<string>();
  const situationIds = new Set<string>();

  const allIds: (number | null)[] = [
    sirecData.reclamation.service_recepteur_niv1,
    sirecData.reclamation.service_gestionnaire,
    ...sirecData.groupIds,
  ];

  for (const fieldValue of allIds) {
    if (!fieldValue) continue;

    const { requeteEntiteIds, situationEntiteIds } = transcodeAffectation(fieldValue);
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
