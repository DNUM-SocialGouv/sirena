import type { EntiteAdminType } from '../types.js';

export type CtcdEntiteType = Extract<EntiteAdminType, 'CD' | 'DD'>;

export const isCtcdEntiteType = (entiteType: EntiteAdminType): entiteType is CtcdEntiteType =>
  entiteType === 'CD' || entiteType === 'DD';

/**
 * Codes de collectivité acceptés pour rattacher une situation à un CD ou une DDETS.
 *
 * Deux conventions coexistent en base : le code de collectivité du référentiel INSEE
 * (`76D`, et ses cas particuliers `75C` pour Paris, `69M` pour la Métropole de Lyon,
 * `20R` pour la Corse, `6AE` pour l'Alsace) et la convention interne département + type
 * (`76CD`, `76DD`). Les deux sont donc essayées.
 *
 * Utilisé à la fois par l'affectation et par le rapport de couverture du référentiel :
 * les deux doivent rester d'accord sur ce qui compte comme entité présente.
 */
export const getCtcdCodeCandidates = (
  departementCode: string,
  ctcdCode: string,
  entiteType: CtcdEntiteType,
): string[] => [...new Set([ctcdCode, `${departementCode}${entiteType}`])];
