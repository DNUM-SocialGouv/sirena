import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { transcodeAffectation } from '../transco/affectation.transco.js';
import { SIREC_DICO } from '../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';

export interface SirenaProvenanceData {
  nom: string;
  entiteId: string;
  note: string;
}

function formatDateNote(date: Date | null): string {
  if (date === null) return 'Date de réception non renseignée';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `Date de réception à l'institution de provenance : ${d}/${m}/${date.getFullYear()}`;
}

function formatReponseNote(reponse: number | null): string {
  if (reponse === null) return 'Réponse attendue non précisée';
  const label = SIREC_DICO[reponse];
  if (label === undefined) throw new SirecTranscoError(reponse, 'reponse_attendue');
  return `Réponse attendue : ${label}`;
}

export function transformSirecProvenances(sirecData: SirecReclamationData): SirenaProvenanceData[] {
  return sirecData.provenances.map(({ id_provenance, id_group, date_signalement, reponse_attendue }) => {
    const nom = SIREC_DICO[id_provenance];
    if (nom === undefined) throw new SirecTranscoError(id_provenance, 'provenance');

    const { requeteEntiteIds } = transcodeAffectation(id_group);
    return {
      nom,
      entiteId: requeteEntiteIds[0],
      note: [formatDateNote(date_signalement), formatReponseNote(reponse_attendue)].join('\n'),
    };
  });
}
