import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SIREC_BOOLEAN_TRANSCO } from '../../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

const NOM_ETAPE = 'Envoyer un accusé de réception au déclarant';

export function transformSirecAccuseReception(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const { accuser_reception, date_envoi_ar, accuser_reception_precision } = sirecData.reclamation;

  if (accuser_reception === null) return [];

  const value = SIREC_BOOLEAN_TRANSCO[accuser_reception];
  if (value === undefined) throw new SirecTranscoError(accuser_reception, 'accuser_reception');

  return arsEntiteIds.map((entiteId) => {
    if (!value) {
      return {
        nom: NOM_ETAPE,
        entiteId,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        note: "Envoi d'un accusé de réception : non",
      };
    }

    const parts: string[] = [];
    if (date_envoi_ar !== null) {
      parts.push(`Date d'envoi de l'accusé de réception au requérant : ${formatSirecDate(date_envoi_ar)}`);
    }
    if (accuser_reception_precision !== null) {
      parts.push(`Précisions : ${accuser_reception_precision}`);
    }

    return {
      nom: NOM_ETAPE,
      entiteId,
      statutId: date_envoi_ar !== null ? REQUETE_ETAPE_STATUT_TYPES.FAIT : REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
      ...(date_envoi_ar !== null ? { createdAt: date_envoi_ar } : {}),
      note: parts.length > 0 ? parts.join('\n') : null,
    };
  });
}
