import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transcodeClotureReason } from '../../transco/cloture.transco.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

export function transformSirecCloture(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): { requeteStatutId: string; etapes: SirenaEtapeData[] } {
  const { type_cloture, motif_cloture, date_cloture } = sirecData.reclamation;

  if (type_cloture === null) {
    return { requeteStatutId: REQUETE_STATUT_TYPES.EN_COURS, etapes: [] };
  }

  const clotureReason = transcodeClotureReason(type_cloture);

  const etapes = arsEntiteIds.map((entiteId) => ({
    nom: 'Clôture',
    entiteId,
    statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
    ...(date_cloture !== null ? { createdAt: date_cloture } : {}),
    note: motif_cloture,
    ...(clotureReason !== null ? { clotureReason } : {}),
  }));

  return { requeteStatutId: REQUETE_STATUT_TYPES.CLOTUREE, etapes };
}
