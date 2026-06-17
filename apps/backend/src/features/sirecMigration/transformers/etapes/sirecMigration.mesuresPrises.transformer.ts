import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SIREC_BOOLEAN_TRANSCO, SIREC_DICO } from '../../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

function transcodeInitiative(id: number): string {
  const label = SIREC_DICO[id];
  if (label === undefined) throw new SirecTranscoError(id, 'mesuresInitiative');
  return label;
}

export function transformSirecMesuresPrises(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const { mesures_prises, mesures_initiative, mesures_precision, sys_last_mod_date } = sirecData.reclamation;

  if (mesures_prises === null || !SIREC_BOOLEAN_TRANSCO[mesures_prises]) return [];

  const noteParts: string[] = [];

  if (mesures_initiative !== null) {
    noteParts.push(`Mesure à l'initiative de : ${transcodeInitiative(mesures_initiative)}`);
  }

  if (mesures_precision !== null) {
    noteParts.push(`Précisions : ${mesures_precision}`);
  }

  const note = noteParts.length > 0 ? noteParts.join('\n') : null;

  return arsEntiteIds.map((entiteId) => ({
    nom: 'Mesures prises par le mis en cause',
    entiteId,
    statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
    ...(sys_last_mod_date !== null ? { createdAt: sys_last_mod_date } : {}),
    note,
  }));
}
