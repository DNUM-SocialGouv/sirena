import type { SirecReclamationData } from '../sirecMigration.repository.js';
import { transcodeAffectation } from '../transco/affectation.transco.js';
import { SIREC_DICO } from '../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../transco/sirecTransco.error.js';

export interface SirenaProvenanceData {
  nom: string;
  entiteId: string;
}

export function transformSirecProvenances(sirecData: SirecReclamationData): SirenaProvenanceData[] {
  return sirecData.provenances.map(({ id_provenance, id_group }) => {
    const nom = SIREC_DICO[id_provenance];
    if (nom === undefined) throw new SirecTranscoError(id_provenance, 'provenance');

    const { requeteEntiteIds } = transcodeAffectation(id_group);
    return { nom, entiteId: requeteEntiteIds[0] };
  });
}
