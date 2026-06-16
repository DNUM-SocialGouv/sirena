import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transcodeAffectation } from '../../transco/affectation/affectation.transco.js';
import { SIREC_DICO } from '../../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

export function transformSirecReponseProvenances(sirecData: SirecReclamationData): SirenaEtapeData[] {
  const { date_rep_provenance1, date_rep_provenance2, date_rep_provenance3 } = sirecData.reclamation;
  const reponseDates: (Date | null)[] = [date_rep_provenance1, date_rep_provenance2, date_rep_provenance3];

  const etapes: SirenaEtapeData[] = [];
  const provenanceForEntitySet = new Set<string>();

  for (let i = 0; i < sirecData.provenances.length && i < 3; i++) {
    const date = reponseDates[i];
    if (date === null) continue;

    const { id_provenance, id_group } = sirecData.provenances[i];
    const institutionNom = SIREC_DICO[id_provenance];
    if (institutionNom === undefined) throw new SirecTranscoError(id_provenance, 'provenance');

    const { requeteEntiteIds } = transcodeAffectation(id_group);
    const entiteId = requeteEntiteIds[0];

    const currentProvenanceForEntity = `${id_provenance}:${entiteId}`;
    if (provenanceForEntitySet.has(currentProvenanceForEntity)) continue;
    provenanceForEntitySet.add(currentProvenanceForEntity);

    etapes.push({
      nom: `Réponse à l'institution de provenance : ${institutionNom}`,
      entiteId,
      statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
      createdAt: date,
      note: `Date de la réponse : ${formatSirecDate(date)}`,
    });
  }

  return etapes;
}
