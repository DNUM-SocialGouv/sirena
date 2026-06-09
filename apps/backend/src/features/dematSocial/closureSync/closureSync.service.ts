import { DossierState } from '../../../graphql/graphql.js';
import { getLoggerStore, getSentryStore } from '../../../libs/asyncLocalStorage.js';
import {
  acceptDossierWithoutNotification,
  classerDossierSansSuiteWithoutNotification,
  getRequete,
  updateInstruction,
} from '../dematSocial.service.js';
import { loadClosedRequeteForDematSocialSync } from './closedRequeteSyncData.service.js';
import { decideDematSocialClosureTarget } from './closureReasonDecision.js';

const finalStates = new Set<DossierState>([DossierState.Accepte, DossierState.Refuse, DossierState.SansSuite]);

export type DematSocialClosureSyncResult = { kind: 'synced' } | { kind: 'skipped'; reason: string };

export async function syncClosedRequeteToDematSocial(requeteId: string): Promise<DematSocialClosureSyncResult> {
  const logger = getLoggerStore();
  const syncData = await loadClosedRequeteForDematSocialSync(requeteId);

  if (syncData.kind === 'skip') {
    logger.debug({ requeteId, reason: syncData.reason }, 'Skipping demat.social closure sync');
    return { kind: 'skipped', reason: syncData.reason };
  }

  if (syncData.kind === 'anomaly') {
    logger.warn(
      { requeteId, reason: syncData.reason, entiteIds: syncData.entiteIds },
      'Skipping demat.social closure sync anomaly',
    );
    return { kind: 'skipped', reason: syncData.reason };
  }

  const decision = decideDematSocialClosureTarget(syncData.closureReasons);
  if (decision.kind === 'skip') {
    logger.warn(
      { requeteId, dematSocialId: syncData.dematSocialId, reason: decision.reason },
      'Skipping demat.social closure sync anomaly',
    );
    return { kind: 'skipped', reason: decision.reason };
  }

  const dematSocialDossier = await getRequete(syncData.dematSocialId);
  const dossier = dematSocialDossier?.dossier;
  if (!dossier) {
    logger.warn(
      { requeteId, dematSocialId: syncData.dematSocialId },
      'Skipping demat.social closure sync: dossier not found',
    );
    return { kind: 'skipped', reason: 'DOSSIER_NOT_FOUND' };
  }

  if (dossier.state === decision.targetState) {
    logger.debug(
      { requeteId, dematSocialId: syncData.dematSocialId, expectedState: decision.targetState },
      'demat.social dossier already in expected final state',
    );
    return { kind: 'skipped', reason: 'ALREADY_EXPECTED_FINAL_STATE' };
  }

  if (dossier.state === DossierState.Refuse) {
    logger.debug({ requeteId, dematSocialId: syncData.dematSocialId }, 'demat.social dossier already refused');
    return { kind: 'skipped', reason: 'ALREADY_REFUSED' };
  }

  if (finalStates.has(dossier.state)) {
    logger.warn(
      {
        requeteId,
        dematSocialId: syncData.dematSocialId,
        expectedState: decision.targetState,
        currentState: dossier.state,
      },
      'demat.social dossier already in a different final state',
    );
    return { kind: 'skipped', reason: 'DIFFERENT_FINAL_STATE' };
  }

  if (dossier.state === DossierState.EnConstruction) {
    const instruction = await updateInstruction(dossier.id);
    const errors = instruction?.dossierPasserEnInstruction?.errors ?? [];
    if (errors.length > 0 || !instruction?.dossierPasserEnInstruction?.dossier) {
      const message = errors.map((error) => error.message).join(', ') || 'No dossier returned';
      throw new Error(`demat.social dossierPasserEnInstruction failed: ${message}`);
    }
  }

  if (decision.targetState === DossierState.Accepte) {
    await acceptDossierWithoutNotification(dossier.id, decision.motivation);
    return { kind: 'synced' };
  }

  await classerDossierSansSuiteWithoutNotification(dossier.id, decision.motivation);
  return { kind: 'synced' };
}

export async function safeSyncClosedRequeteToDematSocial(requeteId: string): Promise<void> {
  try {
    await syncClosedRequeteToDematSocial(requeteId);
  } catch (err) {
    const logger = getLoggerStore();
    const sentry = getSentryStore();
    logger.error({ err, requeteId }, 'Error during demat.social closure sync');
    sentry.captureException(err);
  }
}
