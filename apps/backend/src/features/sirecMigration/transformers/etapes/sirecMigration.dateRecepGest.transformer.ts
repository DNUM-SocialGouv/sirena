import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { getAffectationLabel } from '../../transco/affectation/affectation.transco.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

export function transformSirecDateRecepGest(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const { date_recep_gest, service_recepteur_niv1 } = sirecData.reclamation;

  if (date_recep_gest === null) return [];

  const noteParts = [`Date de réception au service de premier niveau : ${formatSirecDate(date_recep_gest)}`];
  const serviceLabel = getAffectationLabel(service_recepteur_niv1);
  if (serviceLabel !== null) {
    noteParts.push(`Service de premier niveau : ${serviceLabel}`);
  }

  return arsEntiteIds.map((entiteId) => ({
    nom: 'Réception au service de premier niveau',
    entiteId,
    statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
    createdAt: date_recep_gest,
    dateRealisation: date_recep_gest,
    note: noteParts.join('\n'),
  }));
}
