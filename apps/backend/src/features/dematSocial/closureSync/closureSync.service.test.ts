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

const mockSyncData = () => {
  vi.mocked(loadClosedRequeteForDematSocialSync).mockResolvedValueOnce({
    kind: 'candidate',
    requeteId: 'requete-1',
    dematSocialId: 123,
  });
};

const mockDossierState = (state: DossierState) => {
  vi.mocked(getRequete).mockResolvedValueOnce({
    dossier: {
      id: 'RG9zc2llci0xMjM=',
      number: 123,
      state,
    },
  } as Awaited<ReturnType<typeof getRequete>>);
};

describe('syncClosedRequeteToDematSocial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips when the Requête SIRENA is not eligible for demat.social sync', async () => {
    vi.mocked(loadClosedRequeteForDematSocialSync).mockResolvedValueOnce({
      kind: 'skip',
      reason: 'REQUETE_WITHOUT_DEMAT_SOCIAL_ID',
    });

    await syncClosedRequeteToDematSocial('requete-1');

    expect(getRequete).not.toHaveBeenCalled();
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
    expect(classerDossierSansSuiteWithoutNotification).not.toHaveBeenCalled();
  });

  it('logs and skips when the demat.social dossier cannot be read', async () => {
    mockSyncData();
    vi.mocked(getRequete).mockResolvedValueOnce({ dossier: null } as unknown as Awaited<ReturnType<typeof getRequete>>);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requeteId: 'requete-1', dematSocialId: 123 }),
      expect.stringContaining('dossier not found'),
    );
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
  });

  it('does nothing when demat.social is already in the expected final state', async () => {
    mockSyncData();
    mockDossierState(DossierState.Accepte);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(getRequete).toHaveBeenCalledWith(123);
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
    expect(classerDossierSansSuiteWithoutNotification).not.toHaveBeenCalled();
  });

  it('logs an anomaly and does not overwrite a refused demat.social dossier', async () => {
    mockSyncData();
    mockDossierState(DossierState.Refuse);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        requeteId: 'requete-1',
        dematSocialId: 123,
        expectedState: DossierState.Accepte,
        currentState: DossierState.Refuse,
      }),
      expect.stringContaining('different final state'),
    );
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
    expect(classerDossierSansSuiteWithoutNotification).not.toHaveBeenCalled();
  });

  it('logs an anomaly and does not overwrite a different final demat.social state', async () => {
    mockSyncData();
    mockDossierState(DossierState.SansSuite);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requeteId: 'requete-1', dematSocialId: 123, expectedState: DossierState.Accepte }),
      expect.stringContaining('different final state'),
    );
    expect(acceptDossierWithoutNotification).not.toHaveBeenCalled();
  });

  it('accepts an en_instruction demat.social dossier with the SIRENA takeover motivation', async () => {
    mockSyncData();
    mockDossierState(DossierState.EnInstruction);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(acceptDossierWithoutNotification).toHaveBeenCalledWith('Dossier-123', 'Dossier pris en charge dans SIRENA');
  });

  it('passes an en_construction demat.social dossier to instruction before accepting it', async () => {
    mockSyncData();
    mockDossierState(DossierState.EnConstruction);
    vi.mocked(updateInstruction).mockResolvedValueOnce({
      dossierPasserEnInstruction: {
        dossier: { id: 'Dossier-123', number: 123, state: DossierState.EnInstruction },
        errors: [],
      },
    } as Awaited<ReturnType<typeof updateInstruction>>);

    await syncClosedRequeteToDematSocial('requete-1');

    expect(updateInstruction).toHaveBeenCalledWith('Dossier-123');
    expect(acceptDossierWithoutNotification).toHaveBeenCalledWith('Dossier-123', 'Dossier pris en charge dans SIRENA');
    expect(classerDossierSansSuiteWithoutNotification).not.toHaveBeenCalled();
  });

  it('throws and does not finalise when passing an en_construction dossier to instruction returns errors', async () => {
    mockSyncData();
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
