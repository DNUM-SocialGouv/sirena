import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SIREC_DICO } from '../../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

function formatDateNote(date: Date | null): string {
  if (date === null) return 'Date de réception non renseignée';
  return `Date de réception à l'institution de provenance : ${formatSirecDate(date)}`;
}

function formatReponseNote(reponse: number | null): string {
  if (reponse === null) return 'Réponse attendue non précisée';
  const label = SIREC_DICO[reponse];
  if (label === undefined) throw new SirecTranscoError(reponse, 'reponse_attendue');
  return `Réponse attendue : ${label}`;
}

export function transformSirecReceptionProvenances(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const etapes: SirenaEtapeData[] = [];
  const provenanceForEntitySet = new Set<string>();

  for (const { id_provenance, date_signalement, reponse_attendue } of sirecData.provenances) {
    const institutionNom = SIREC_DICO[id_provenance];
    if (institutionNom === undefined) throw new SirecTranscoError(id_provenance, 'provenance');

    for (const entiteId of arsEntiteIds) {
      const currentProvenanceForEntity = `${id_provenance}:${entiteId}`;
      if (provenanceForEntitySet.has(currentProvenanceForEntity)) continue;
      provenanceForEntitySet.add(currentProvenanceForEntity);

      etapes.push({
        nom: `Réception à l'institution de provenance : ${institutionNom}`,
        entiteId,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        createdAt: date_signalement || sirecData.reclamation.sys_creation_date,
        ...(date_signalement && { dateRealisation: date_signalement }),
        note: [formatDateNote(date_signalement), formatReponseNote(reponse_attendue)].join('\n'),
      });
    }
  }

  return etapes;
}
