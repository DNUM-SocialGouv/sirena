import { DossierState } from '../../../graphql/graphql.js';
import { getLoggerStore, getSentryStore } from '../../../libs/asyncLocalStorage.js';
import { acceptDossierWithoutNotification, getRequete, updateInstruction } from '../dematSocial.service.js';
import { loadRequetePriseEnChargeForDematSocialSync } from './closedRequeteSyncData.service.js';

const finalStates = new Set<DossierState>([DossierState.Accepte, DossierState.Refuse, DossierState.SansSuite]);
const SIRENA_TAKEOVER_ACCEPTANCE_MOTIVATION = 'Dossier pris en charge dans SIRENA';

export type DematSocialClosureSyncResult = { kind: 'synced' } | { kind: 'skipped'; reason: string };

export async function syncRequetePriseEnChargeToDematSocial(requeteId: string): Promise<DematSocialClosureSyncResult> {
  const logger = getLoggerStore();
  const syncData = await loadRequetePriseEnChargeForDematSocialSync(requeteId);

  if (syncData.kind === 'skip') {
    logger.debug({ requeteId, reason: syncData.reason }, 'Skipping demat.social closure sync');
    return { kind: 'skipped', reason: syncData.reason };
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

  if (dossier.state === DossierState.Accepte) {
    logger.debug(
      { requeteId, dematSocialId: syncData.dematSocialId, expectedState: DossierState.Accepte },
      'demat.social dossier already in expected final state',
    );
    return { kind: 'skipped', reason: 'ALREADY_EXPECTED_FINAL_STATE' };
  }

  if (finalStates.has(dossier.state)) {
    logger.warn(
      {
        requeteId,
        dematSocialId: syncData.dematSocialId,
        expectedState: DossierState.Accepte,
        currentState: dossier.state,
      },
      'demat.social dossier already in a different final state',
    );
    return { kind: 'skipped', reason: 'DIFFERENT_FINAL_STATE' };
  }

  const dossierMutationId = `Dossier-${syncData.dematSocialId}`;

  if (dossier.state === DossierState.EnConstruction) {
    const instruction = await updateInstruction(dossierMutationId);
    const errors = instruction?.dossierPasserEnInstruction?.errors ?? [];
    if (errors.length > 0 || !instruction?.dossierPasserEnInstruction?.dossier) {
      const message = errors.map((error) => error.message).join(', ') || 'No dossier returned';
      throw new Error(`demat.social dossierPasserEnInstruction failed: ${message}`);
    }
  }

  await acceptDossierWithoutNotification(dossierMutationId, SIRENA_TAKEOVER_ACCEPTANCE_MOTIVATION);

  return { kind: 'synced' };
}

export async function safeSyncRequetePriseEnChargeToDematSocial(requeteId: string): Promise<void> {
  try {
    await syncRequetePriseEnChargeToDematSocial(requeteId);
  } catch (err) {
    const logger = getLoggerStore();
    const sentry = getSentryStore();
    logger.error({ err, requeteId }, 'Error during demat.social takeover sync');
    sentry.captureException(err);
  }
}

export const syncClosedRequeteToDematSocial = syncRequetePriseEnChargeToDematSocial;
export const safeSyncClosedRequeteToDematSocial = safeSyncRequetePriseEnChargeToDematSocial;
