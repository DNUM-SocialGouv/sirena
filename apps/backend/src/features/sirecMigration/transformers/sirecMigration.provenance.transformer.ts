import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { transcodeAffectation } from '../transco/affectation.transco.js';
import { SIREC_DICO } from '../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';
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

export function transformSirecProvenances(sirecData: SirecReclamationData): SirenaEtapeData[] {
  return sirecData.provenances.map(({ id_provenance, id_group, date_signalement, reponse_attendue }) => {
    const institutionNom = SIREC_DICO[id_provenance];
    if (institutionNom === undefined) throw new SirecTranscoError(id_provenance, 'provenance');

    const { requeteEntiteIds } = transcodeAffectation(id_group);
    return {
      nom: `Réception à l'institution de provenance : ${institutionNom}`,
      entiteId: requeteEntiteIds[0],
      statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
      note: [formatDateNote(date_signalement), formatReponseNote(reponse_attendue)].join('\n'),
    };
  });
}
