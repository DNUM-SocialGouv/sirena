import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { toSirecLocalDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transcodeClotureReason } from '../../transco/cloture.transco.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

export function transformSirecCloture(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): { requeteStatutId: string; etapes: SirenaEtapeData[] } {
  const { type_cloture, motif_cloture, date_cloture, sys_last_mod_date } = sirecData.reclamation;

  if (type_cloture === null) {
    return { requeteStatutId: REQUETE_STATUT_TYPES.EN_COURS, etapes: [] };
  }

  const clotureReason = transcodeClotureReason(type_cloture);
  const rawClotureEffectiveDate = date_cloture ?? sys_last_mod_date ?? undefined;
  const clotureEffectiveDate =
    rawClotureEffectiveDate !== undefined ? toSirecLocalDate(rawClotureEffectiveDate) : undefined;

  const etapes = arsEntiteIds.map(
    (entiteId): SirenaEtapeData => ({
      nom: 'Clôture',
      entiteId,
      statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
      note: motif_cloture,
      ...(clotureReason !== null ? { clotureReason } : {}),
      createdAt: sirecData.reclamation.sys_last_mod_date,
      ...(clotureEffectiveDate !== undefined ? { clotureEffectiveDate, dateRealisation: clotureEffectiveDate } : {}),
    }),
  );

  return { requeteStatutId: REQUETE_STATUT_TYPES.CLOTUREE, etapes };
}
