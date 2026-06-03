import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { computeSituationEntiteIds } from './sirecMigration.affectation.transformer.js';
import { type SirenaSituationData, transformSirecSituation } from './sirecMigration.situation.transformer.js';

export function transformSirecMisEnCauseSituations(
  sirecData: SirecReclamationData,
  situationEntiteIds: string[],
): SirenaSituationData[] {
  const { misEnCauses, reclamation, groupIds } = sirecData;

  if (misEnCauses.length === 0) {
    return [transformSirecSituation(sirecData, situationEntiteIds)];
  }

  const baseSituation = transformSirecSituation(sirecData, []);

  const allMisEnCauseGroupIds = new Set(misEnCauses.flatMap((m) => m.groupIds));
  const orphanGroupIds = groupIds.filter((id) => !allMisEnCauseGroupIds.has(id));

  const orphanEntiteIds = computeSituationEntiteIds([
    reclamation.service_recepteur_niv1,
    reclamation.service_gestionnaire,
    ...orphanGroupIds,
  ]);

  return misEnCauses.map((misEnCause) => {
    const misEnCauseEntiteIds = computeSituationEntiteIds(misEnCause.groupIds);
    const entiteIds = [...new Set([...orphanEntiteIds, ...misEnCauseEntiteIds])];
    return { ...baseSituation, entiteIds };
  });
}
