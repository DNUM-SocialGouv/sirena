import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SIREC_BOOLEAN_TRANSCO } from '../../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

const NOM_ETAPE = "Réponse au requérant par l'ARS";

export function transformSirecReponsePlaignant(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const { reponse_plaignant, date_rep_plaignant, reponse_plaignant_precision } = sirecData.reclamation;

  const hasData = reponse_plaignant !== null || date_rep_plaignant !== null || reponse_plaignant_precision !== null;
  if (!hasData) return [];

  const noteParts: string[] = [];

  if (reponse_plaignant !== null) {
    const value = SIREC_BOOLEAN_TRANSCO[reponse_plaignant];
    if (value === undefined) throw new SirecTranscoError(reponse_plaignant, 'reponse_plaignant');
    noteParts.push(`${NOM_ETAPE} : ${value ? 'Oui' : 'Non'}`);
  }

  if (date_rep_plaignant !== null) {
    noteParts.push(`Date de réponse : ${formatSirecDate(date_rep_plaignant)}`);
  }

  if (reponse_plaignant_precision !== null) {
    noteParts.push(`Précisions : ${reponse_plaignant_precision}`);
  }

  return arsEntiteIds.map((entiteId) => ({
    nom: NOM_ETAPE,
    entiteId,
    statutId: date_rep_plaignant !== null ? REQUETE_ETAPE_STATUT_TYPES.FAIT : REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
    ...(date_rep_plaignant !== null ? { createdAt: date_rep_plaignant } : {}),
    note: noteParts.length > 0 ? noteParts.join('\n') : null,
  }));
}
