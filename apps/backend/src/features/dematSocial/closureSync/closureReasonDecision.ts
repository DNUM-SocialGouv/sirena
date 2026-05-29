import type { RequeteClotureReason } from '@sirena/common/constants';
import { REQUETE_CLOTURE_REASON, requeteClotureReasonLabels } from '@sirena/common/constants';
import { DossierState } from '../../../graphql/graphql.js';

export type DematSocialClosureDecision =
  | {
      kind: 'sync';
      targetState: DossierState.Accepte | DossierState.SansSuite;
      reasonLabels: string[];
      motivation: string;
    }
  | {
      kind: 'skip';
      reason: 'NO_USABLE_CLOSURE_REASON';
    };

const effectiveTreatmentReasons = new Set<RequeteClotureReason>([
  REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES,
  REQUETE_CLOTURE_REASON.REPONSE_APPORTEE_PAR_MIS_EN_CAUSE,
  REQUETE_CLOTURE_REASON.DEMANDE_MISE_EN_PLACE_ACTIONS_CORRECTIVES,
  REQUETE_CLOTURE_REASON.REPONSE_APPORTEE_PAR_SERVICE_INSTRUCTEUR,
  REQUETE_CLOTURE_REASON.MISSION_D_INSPECTION_ET_CONTROLE,
  REQUETE_CLOTURE_REASON.MISE_EN_PLACE_ACCOMPAGNEMENT,
  REQUETE_CLOTURE_REASON.MISE_EN_PLACE_RELAIS_FAMILIAL,
  REQUETE_CLOTURE_REASON.ACCES_REVISION_DROIT_PRESTATION,
  REQUETE_CLOTURE_REASON.SAISIE_JUSTICE,
  REQUETE_CLOTURE_REASON.ADMISSION_STRUCTURE,
  REQUETE_CLOTURE_REASON.AUTRE,
]);

const sansSuiteReasons = new Set<RequeteClotureReason>([
  REQUETE_CLOTURE_REASON.HORS_COMPETENCE,
  REQUETE_CLOTURE_REASON.SANS_SUITE,
  REQUETE_CLOTURE_REASON.ABSENCE_DE_RETOUR,
  REQUETE_CLOTURE_REASON.IMPOSSIBLE_EVALUER,
]);

export function decideDematSocialClosureTarget(
  closureReasons: readonly RequeteClotureReason[],
): DematSocialClosureDecision {
  const usableReasons = [...new Set(closureReasons)].filter(
    (reason) => effectiveTreatmentReasons.has(reason) || sansSuiteReasons.has(reason),
  );

  if (usableReasons.length === 0) {
    return { kind: 'skip', reason: 'NO_USABLE_CLOSURE_REASON' };
  }

  const targetState = usableReasons.some((reason) => effectiveTreatmentReasons.has(reason))
    ? DossierState.Accepte
    : DossierState.SansSuite;
  const reasonLabels = usableReasons.map((reason) => requeteClotureReasonLabels[reason]);

  return {
    kind: 'sync',
    targetState,
    reasonLabels,
    motivation: `Dossier clôturé dans SIRENA. Motifs de clôture : ${reasonLabels.join(' ; ')}.`,
  };
}
