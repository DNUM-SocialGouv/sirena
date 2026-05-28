import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../sirecMigration.repository.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

export function transformSirecExamenCommission(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const { date_commission } = sirecData.reclamation;

  if (date_commission === null) return [];

  return arsEntiteIds.map((entiteId) => ({
    nom: 'Examen en commission',
    entiteId,
    statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
    createdAt: date_commission,
    note: `Date d'examen en commission : ${formatSirecDate(date_commission)}`,
  }));
}
