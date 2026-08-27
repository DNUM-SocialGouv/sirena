import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import type { SirecFileRow, SirecReclamationData } from '../../sirecMigration.repository.js';
import { SIREC_BOOLEAN_TRANSCO, SIREC_DICO } from '../../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

function transcodeInitiative(id: number): string {
  const label = SIREC_DICO[id];
  if (label === undefined) throw new SirecTranscoError(id, 'mesuresInitiative');
  return label;
}

/** Date de création du premier fichier SIREC de type mesures_prises (date_creation, ordre chronologique), s'il y en a un exploitable. */
function firstMesuresPrisesFileDate(files: SirecFileRow[]): Date | null {
  const dates = files
    .filter((file) => file.file_type === 'mesures_prises' && file.date_creation !== null)
    .map((file) => file.date_creation as Date)
    .sort((a, b) => a.getTime() - b.getTime());
  return dates[0] ?? null;
}

export function transformSirecMesuresPrises(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const { mesures_prises, mesures_initiative, mesures_precision, sys_creation_date } = sirecData.reclamation;

  if (mesures_prises === null) {
    return [];
  }
  const value = SIREC_BOOLEAN_TRANSCO[mesures_prises];
  if (value === undefined) throw new SirecTranscoError(mesures_prises, 'mesures_prises');
  if (!value) return [];

  const noteParts: string[] = [];

  if (mesures_initiative !== null) {
    noteParts.push(`Mesure à l'initiative de : ${transcodeInitiative(mesures_initiative)}`);
  }

  if (mesures_precision !== null) {
    noteParts.push(`Précisions : ${mesures_precision}`);
  }

  const note = noteParts.length > 0 ? noteParts.join('\n') : null;
  const createdAt = firstMesuresPrisesFileDate(sirecData.files) ?? sys_creation_date;

  return arsEntiteIds.map((entiteId) => ({
    nom: 'Mesures prises par le mis en cause',
    entiteId,
    statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
    createdAt,
    note,
    sirecFileTypeKeys: ['mesures_prises'],
  }));
}
