import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SIREC_DICO } from '../../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

const NOM_ETAPE = 'Prise en charge de la requête';

function transcodeTypeTraitement(id: number): string {
  const label = SIREC_DICO[id];
  if (label === undefined) throw new SirecTranscoError(id, 'typeTraitement');
  return label;
}

export function transformSirecPriseEnCharge(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const { date_traitement, type_traitement_prec } = sirecData.reclamation;
  const { typeTraitementIdDicos } = sirecData;

  const hasData = date_traitement !== null || typeTraitementIdDicos.length > 0 || type_traitement_prec !== null;
  if (!hasData) return [];

  const noteParts: string[] = [];

  if (date_traitement !== null) {
    noteParts.push(`Date de prise en charge : ${formatSirecDate(date_traitement)}`);
  } else {
    noteParts.push('Date de prise en charge : non renseignée');
  }

  if (typeTraitementIdDicos.length > 0) {
    const labels = typeTraitementIdDicos.map(transcodeTypeTraitement);
    noteParts.push(`Type(s) de traitement : ${labels.join(', ')}`);
  }

  if (type_traitement_prec !== null) {
    noteParts.push(`Précisions : ${type_traitement_prec}`);
  }

  return arsEntiteIds.map((entiteId) => ({
    nom: NOM_ETAPE,
    entiteId,
    statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
    ...(date_traitement !== null ? { createdAt: date_traitement } : {}),
    note: noteParts.join('\n'),
  }));
}
