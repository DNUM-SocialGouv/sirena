import type { SirecReclamationRow } from './sirecMigration.repository.js';

// biome-ignore lint/suspicious/noEmptyInterface: vide pour le moment mais sera rempli avec d'autres champs SIREC.
export interface SirenaSituationData {
  // Will be enriched with more SIREC fields
}

export function transformSirecSituation(_row: SirecReclamationRow): SirenaSituationData {
  return {};
}
