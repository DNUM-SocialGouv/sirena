import { REQUETE_CLOTURE_REASON } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { DossierState } from '../../../graphql/graphql.js';
import { decideDematSocialClosureTarget } from './closureReasonDecision.js';

describe('decideDematSocialClosureTarget', () => {
  it('chooses Accepté when at least one latest closure reason indicates effective treatment', () => {
    const decision = decideDematSocialClosureTarget([
      REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES,
      REQUETE_CLOTURE_REASON.REPONSE_APPORTEE_PAR_MIS_EN_CAUSE,
    ]);

    expect(decision).toEqual({
      kind: 'sync',
      targetState: DossierState.Accepte,
      reasonLabels: [
        "Mesures correctives prises par l'établissement / le mis en cause",
        'Réponse apportée par le mis en cause',
      ],
      motivation:
        "Dossier clôturé dans SIRENA. Motifs de clôture : Mesures correctives prises par l'établissement / le mis en cause ; Réponse apportée par le mis en cause.",
    });
  });

  it('chooses Sans suite when all usable latest closure reasons are sans-suite reasons', () => {
    const decision = decideDematSocialClosureTarget([
      REQUETE_CLOTURE_REASON.HORS_COMPETENCE,
      REQUETE_CLOTURE_REASON.ABSENCE_DE_RETOUR,
    ]);

    expect(decision).toMatchObject({
      kind: 'sync',
      targetState: DossierState.SansSuite,
      reasonLabels: ['Hors compétence', 'Absence de retour/accord requérant'],
    });
  });

  it('gives Accepté priority when latest closure reasons mix effective treatment and sans-suite reasons', () => {
    const decision = decideDematSocialClosureTarget([
      REQUETE_CLOTURE_REASON.HORS_COMPETENCE,
      REQUETE_CLOTURE_REASON.MISSION_D_INSPECTION_ET_CONTROLE,
    ]);

    expect(decision).toMatchObject({
      kind: 'sync',
      targetState: DossierState.Accepte,
      reasonLabels: ['Hors compétence', "Mission d'inspection et contrôle"],
    });
  });

  it('skips with anomaly reason when no usable closure reason is available', () => {
    const decision = decideDematSocialClosureTarget([]);

    expect(decision).toEqual({
      kind: 'skip',
      reason: 'NO_USABLE_CLOSURE_REASON',
    });
  });

  it('de-duplicates latest closure reasons for motivation data', () => {
    const decision = decideDematSocialClosureTarget([
      REQUETE_CLOTURE_REASON.SANS_SUITE,
      REQUETE_CLOTURE_REASON.SANS_SUITE,
      REQUETE_CLOTURE_REASON.IMPOSSIBLE_EVALUER,
    ]);

    expect(decision).toEqual({
      kind: 'sync',
      targetState: DossierState.SansSuite,
      reasonLabels: ['Sans suite après évaluation', "Impossible d'évaluer"],
      motivation:
        "Dossier clôturé dans SIRENA. Motifs de clôture : Sans suite après évaluation ; Impossible d'évaluer.",
    });
  });
});
