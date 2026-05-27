import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { SIREC_BOOLEAN_TRANSCO } from '../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';

export interface SirenaAccuseReceptionEtapeData {
  entiteId: string;
  statutId: string;
  createdAt?: Date;
  note: string | null;
}

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

export function transformSirecAccuseReception(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaAccuseReceptionEtapeData[] {
  const { accuser_reception, date_envoi_ar, accuser_reception_precision } = sirecData.reclamation;

  if (accuser_reception === null) return [];

  const value = SIREC_BOOLEAN_TRANSCO[accuser_reception];
  if (value === undefined) throw new SirecTranscoError(accuser_reception, 'accuser_reception');

  return arsEntiteIds.map((entiteId) => {
    if (!value) {
      return {
        entiteId,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        note: "Envoi d'un accusé de réception : non",
      };
    }

    const parts: string[] = [];
    if (date_envoi_ar !== null) {
      parts.push(`Date d'envoi de l'accusé de réception au requérant : ${formatDate(date_envoi_ar)}`);
    }
    if (accuser_reception_precision !== null) {
      parts.push(`Précisions : ${accuser_reception_precision}`);
    }

    return {
      entiteId,
      statutId: date_envoi_ar !== null ? REQUETE_ETAPE_STATUT_TYPES.FAIT : REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
      ...(date_envoi_ar !== null ? { createdAt: date_envoi_ar } : {}),
      note: parts.length > 0 ? parts.join('\n') : null,
    };
  });
}
