import type { RequeteClotureReason } from '@sirena/common/constants';
import { REQUETE_CLOTURE_REASON } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DossierState } from '../../../graphql/graphql.js';
import {
  acceptDossierWithoutNotification,
  classerDossierSansSuiteWithoutNotification,
  getRequete,
  updateInstruction,
} from '../dematSocial.service.js';
import { loadClosedRequeteForDematSocialSync } from './closedRequeteSyncData.service.js';
import { safeSyncClosedRequeteToDematSocial, syncClosedRequeteToDematSocial } from './closureSync.service.js';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
const sentry = {
  captureException: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
};

vi.mock('../../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => logger),
  getSentryStore: vi.fn(() => sentry),
}));

vi.mock('./closedRequeteSyncData.service.js', () => ({
  loadClosedRequeteForDematSocialSync: vi.fn(),
}));

vi.mock('../dematSocial.service.js', () => ({
  acceptDossierWithoutNotification: vi.fn(),
  classerDossierSansSuiteWithoutNotification: vi.fn(),
  getRequete: vi.fn(),
  updateInstruction: vi.fn(),
}));

const mockSyncData = (closureReasons: RequeteClotureReason[] = [REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES]) => {
  vi.mocked(loadClosedRequeteForDematSocialSync).mockResolvedValueOnce({
    kind: 'candidate',
    requeteId: 'requete-1',
    dematSocialId: 123,
    closureReasons,
  });
};

const mockDossierState = (state: DossierState) => {
  vi.mocked(getRequete).mockResolvedValueOnce({
    dossier: {
      id: 'Dossier-123',
      number: 123,
      state,
    },
  } as Awaited<ReturnType<typeof getRequete>>);
};

describe('syncClosedRequeteToDematSocial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips when the closed Requête SIRENA is not eligible for demat.social sync', async () => {
    vi.mocked(loadClosedRequeteForDematSocialSync).mockResolvedValueOnce({
      kind: 'skip',
      reason: 'REQUETE_NOT_COMPLETELY_CLOSED',
    });

    await syncClosedRequeteToDematSocial('requete-1');

    expect(getRequete).not.toHaveBeenCalled();
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
    expect(classerDossierSansSuiteWithoutNotification).not.toHaveBeenCalled();
  });

  it('logs and skips when closed Requête data has an anomaly', async () => {
    vi.mocked(loadClosedRequeteForDematSocialSync).mockResolvedValueOnce({
      kind: 'anomaly',
      reason: 'MISSING_LATEST_CLOSURE_REASONS',
      entiteIds: ['entite-1'],
    });

    await syncClosedRequeteToDematSocial('requete-1');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requeteId: 'requete-1', reason: 'MISSING_LATEST_CLOSURE_REASONS' }),
      expect.stringContaining('anomaly'),
    );
    expect(getRequete).not.toHaveBeenCalled();
  });

  it('logs and skips when no usable closure reason can determine a demat.social target state', async () => {
    mockSyncData([]);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requeteId: 'requete-1', dematSocialId: 123, reason: 'NO_USABLE_CLOSURE_REASON' }),
      expect.stringContaining('anomaly'),
    );
    expect(getRequete).not.toHaveBeenCalled();
  });

  it('logs and skips when the demat.social dossier cannot be read', async () => {
    mockSyncData([REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES]);
    vi.mocked(getRequete).mockResolvedValueOnce({ dossier: null } as unknown as Awaited<ReturnType<typeof getRequete>>);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requeteId: 'requete-1', dematSocialId: 123 }),
      expect.stringContaining('dossier not found'),
    );
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
  });

  it('does nothing when demat.social is already in the expected final state', async () => {
    mockSyncData([REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES]);
    mockDossierState(DossierState.Accepte);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(getRequete).toHaveBeenCalledWith(123);
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
    expect(classerDossierSansSuiteWithoutNotification).not.toHaveBeenCalled();
  });

  it('does not overwrite a refused demat.social dossier', async () => {
    mockSyncData([REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES]);
    mockDossierState(DossierState.Refuse);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
    expect(classerDossierSansSuiteWithoutNotification).not.toHaveBeenCalled();
  });

  it('logs an anomaly and does not overwrite a different final demat.social state', async () => {
    mockSyncData([REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES]);
    mockDossierState(DossierState.SansSuite);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requeteId: 'requete-1', dematSocialId: 123, expectedState: DossierState.Accepte }),
      expect.stringContaining('different final state'),
    );
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
  });

  it('accepts an en_instruction demat.social dossier when expected state is Accepté', async () => {
    mockSyncData([REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES]);
    mockDossierState(DossierState.EnInstruction);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(acceptDossierWithoutNotification).toHaveBeenCalledWith(
      'Dossier-123',
      "Dossier clôturé dans SIRENA. Motifs de clôture : Mesures correctives prises par l'établissement / le mis en cause.",
    );
  });

  it('classifies an en_instruction demat.social dossier sans suite when expected state is Sans suite', async () => {
    mockSyncData([REQUETE_CLOTURE_REASON.HORS_COMPETENCE]);
    mockDossierState(DossierState.EnInstruction);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(classerDossierSansSuiteWithoutNotification).toHaveBeenCalledWith(
      'Dossier-123',
      'Dossier clôturé dans SIRENA. Motifs de clôture : Hors compétence.',
    );
  });

  it('passes an en_construction demat.social dossier to instruction before finalising it', async () => {
    mockSyncData([REQUETE_CLOTURE_REASON.HORS_COMPETENCE]);
    mockDossierState(DossierState.EnConstruction);
    vi.mocked(updateInstruction).mockResolvedValueOnce({
      dossierPasserEnInstruction: { dossier: { id: 'Dossier-123' }, errors: [] },
    } as Awaited<ReturnType<typeof updateInstruction>>);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(updateInstruction).toHaveBeenCalledWith('Dossier-123');
    expect(classerDossierSansSuiteWithoutNotification).toHaveBeenCalledWith(
      'Dossier-123',
      'Dossier clôturé dans SIRENA. Motifs de clôture : Hors compétence.',
    );
  });

  it('throws and does not finalise when passing an en_construction dossier to instruction returns errors', async () => {
    mockSyncData([REQUETE_CLOTURE_REASON.HORS_COMPETENCE]);
    mockDossierState(DossierState.EnConstruction);
    vi.mocked(updateInstruction).mockResolvedValueOnce({
      dossierPasserEnInstruction: { dossier: null, errors: [{ message: 'Transition impossible' }] },
    } as unknown as Awaited<ReturnType<typeof updateInstruction>>);

    await expect(syncClosedRequeteToDematSocial('requete-1')).rejects.toThrow('Transition impossible');

    expect(classerDossierSansSuiteWithoutNotification).not.toHaveBeenCalled();
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
  });
});

describe('safeSyncClosedRequeteToDematSocial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs and reports sync errors without throwing', async () => {
    const error = new Error('demat.social unavailable');
    vi.mocked(loadClosedRequeteForDematSocialSync).mockRejectedValueOnce(error);

    await expect(safeSyncClosedRequeteToDematSocial('requete-1')).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: error, requeteId: 'requete-1' }),
      expect.stringContaining('demat.social'),
    );
    expect(sentry.captureException).toHaveBeenCalledWith(error);
  });
});
