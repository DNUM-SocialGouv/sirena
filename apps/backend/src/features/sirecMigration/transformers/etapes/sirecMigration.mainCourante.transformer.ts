import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transcodeAffectation } from '../../transco/affectation/affectation.transco.js';
import { SIREC_DICO } from '../../transco/dictionnaire.transco.js';
import { SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

function transcodeTypeAction(typeAction1: number | null): string {
  if (typeAction1 === null) return 'Type de traitement : Autre';
  const label = SIREC_DICO[typeAction1];
  if (label === undefined) throw new SirecTranscoError(typeAction1, 'typeAction');
  return label;
}

function buildNote(commentaire: string | null, dateAction: Date | null): string | null {
  const parts: string[] = [];
  if (commentaire !== null) parts.push(`Commentaire : ${commentaire}`);
  if (dateAction !== null) parts.push(`Date de l'action : ${formatSirecDate(dateAction)}`);
  return parts.length > 0 ? parts.join('\n') : null;
}

export function transformSirecMainCourantes(sirecData: SirecReclamationData): SirenaEtapeData[] {
  const etapes: SirenaEtapeData[] = [];
  const mainCouranteForEntitySet = new Set<string>();

  for (const mc of sirecData.mainCourantes) {
    const nom = transcodeTypeAction(mc.type_action1);
    const note = buildNote(mc.commentaire, mc.date_action);

    for (const id_group of mc.groupIds) {
      const { requeteEntiteIds } = transcodeAffectation(id_group);

      for (const entiteId of requeteEntiteIds) {
        const currentMainCouranteForEntity = `${mc.id_data}:${entiteId}`;
        if (mainCouranteForEntitySet.has(currentMainCouranteForEntity)) continue;
        mainCouranteForEntitySet.add(currentMainCouranteForEntity);

        etapes.push({
          nom,
          entiteId,
          statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
          ...(mc.date_action !== null ? { createdAt: mc.date_action } : {}),
          note,
        });
      }
    }
  }

  return etapes;
}
