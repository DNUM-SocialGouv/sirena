import type { SituationData } from '@sirena/common/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadFile } from '@/lib/api/fetchUploadedFiles';
import { client } from '@/lib/api/hc';
import { HttpError } from '@/lib/api/tanstackQuery';
import { formatSituationFromServer } from '@/lib/situation';
import { useSituationSave } from './useSituationSave';

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: () => ({ data: { topEntiteId: 'top-entite-1' } }),
}));

vi.mock('@/lib/toastManager', () => ({
  toastManager: { add: vi.fn() },
}));

vi.mock('@/lib/api/fetchUploadedFiles', () => ({
  uploadFile: vi.fn(async () => ({ id: 'file-new' })),
}));

vi.mock('@/lib/api/hc', () => ({
  client: {
    'requetes-entite': {
      ':id': {
        situation: {
          $post: vi.fn(),
          ':situationId': { $patch: vi.fn() },
        },
      },
    },
  },
}));

vi.mock('@/lib/api/tanstackQuery', () => {
  class HttpError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'HttpError';
    }
  }
  return {
    HttpError,
    handleRequestErrors: vi.fn(async (response: Response) => {
      if (!response.ok) throw new HttpError('boom');
    }),
  };
});

const patch = vi.mocked(client['requetes-entite'][':id'].situation[':situationId'].$patch);
const post = vi.mocked(client['requetes-entite'][':id'].situation.$post);
const upload = vi.mocked(uploadFile);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const LOADED_UPDATED_AT = '2026-01-01T10:00:00.000Z';
const SERVER_UPDATED_AT = '2026-01-01T11:00:00.000Z';
const REFETCHED_UPDATED_AT = '2026-01-01T12:00:00.000Z';

const renderSave = (situationUpdatedAt?: string) =>
  renderHook(
    () => useSituationSave({ requestId: 'req-1', situationId: 'sit-1', situationUpdatedAt, onRefetch: vi.fn() }),
    { wrapper },
  ).result;

const renderCreate = () =>
  renderHook(() => useSituationSave({ requestId: 'req-1', onRefetch: vi.fn() }), { wrapper }).result;

const renderEditSession = (updatedAt?: string) =>
  renderHook(
    ({ updatedAt: situationUpdatedAt }: { updatedAt?: string }) =>
      useSituationSave({ requestId: 'req-1', situationId: 'sit-1', situationUpdatedAt, onRefetch: vi.fn() }),
    { wrapper, initialProps: { updatedAt } },
  );

const serverSituation = ({ ville = 'Paris', commentaire = 'Traitement interrompu' } = {}) => ({
  id: 'sit-1',
  lieuDeSurvenue: {
    lieuType: { id: 'ETABLISSEMENT_SANTE' },
    lieuPrecision: null,
    transportType: null,
    codePostal: '75012',
    societeTransport: null,
    finess: null,
    tutelle: null,
    categCode: null,
    categLib: null,
    adresse: { label: null, numero: null, rue: null, codePostal: '75012', ville },
  },
  misEnCause: null,
  faits: [
    {
      motifs: [],
      motifsDeclaratifs: [],
      maltraitanceTypes: [],
      commentaire,
      dateDebut: null,
      dateFin: null,
      autresPrecisions: null,
      consequences: [],
      fichiers: [],
    },
  ],
  demarchesEngagees: null,
  domainesFonctionnels: null,
  traitementDesFaits: { entites: [] },
  estLieAuSignalement: null,
  numerosSignalement: '',
});

const loadedSituation = () => formatSituationFromServer(serverSituation() as never);

const withVille = (data: SituationData, ville: string): SituationData => ({
  ...data,
  lieuDeSurvenue: {
    ...data.lieuDeSurvenue,
    adresse: { ...data.lieuDeSurvenue?.adresse, ville },
  },
});

const conflictResponse = (
  cause: Record<string, unknown> = {
    serverData: serverSituation({ ville: 'Lyon' }),
    serverUpdatedAt: SERVER_UPDATED_AT,
  },
) =>
  new Response(
    JSON.stringify({
      message: 'The situation has been modified by another user.',
      cause: { kind: 'BUSINESS', ...cause },
    }),
    { status: 409, headers: { 'Content-Type': 'application/json' } },
  ) as never;

const autoMergeableResponse = () =>
  conflictResponse({
    serverData: serverSituation({ commentaire: 'Traitement repris' }),
    serverUpdatedAt: SERVER_UPDATED_AT,
  });

const okResponse = () =>
  new Response(JSON.stringify({ data: {}, shouldCloseRequeteStatus: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as never;

const patchedJson = (call: number) => (patch.mock.calls[call][0] as { json: Record<string, unknown> }).json;
const patchedSituation = (call: number) => patchedJson(call).situation as SituationData;

describe('useSituationSave', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves on a 409 conflict instead of rejecting into an unhandled rejection', async () => {
    patch.mockResolvedValue(conflictResponse());

    const { handleSave } = renderSave(LOADED_UPDATED_AT).current;

    await expect(handleSave(loadedSituation(), false, [])).resolves.toBeUndefined();
  });

  it('still rejects on a non-conflict failure', async () => {
    patch.mockResolvedValue(new Response(null, { status: 500 }) as never);

    const { handleSave } = renderSave(LOADED_UPDATED_AT).current;

    await expect(handleSave(loadedSituation(), false, [])).rejects.toBeInstanceOf(HttpError);
  });

  it('names the conflicting leaf, not the branch, when a nested field changed on both sides', async () => {
    patch.mockResolvedValueOnce(conflictResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = loadedSituation();

    await result.current.handleSave(withVille(loadedSituation(), 'Marseille'), false, []);

    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));
    expect(result.current.conflicts).toEqual([
      expect.objectContaining({
        field: 'lieuDeSurvenue.adresse.ville',
        originalValue: 'Paris',
        currentValue: 'Marseille',
        serverValue: 'Lyon',
      }),
    ]);
  });

  it('merges two nested fields changed on different sides without asking anything', async () => {
    patch.mockResolvedValueOnce(autoMergeableResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = loadedSituation();

    await result.current.handleSave(withVille(loadedSituation(), 'Marseille'), false, []);

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(result.current.showConflictDialog).toBe(false);
    expect(patchedSituation(1).lieuDeSurvenue?.adresse?.ville).toBe('Marseille');
    expect(patchedSituation(1).fait?.commentaire).toBe('Traitement repris');
  });

  it('replays a resolved conflict against the version it was resolved from', async () => {
    patch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = loadedSituation();

    await result.current.handleSave(withVille(loadedSituation(), 'Marseille'), false, []);
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));

    expect(patchedJson(0).controls).toEqual({ situation: { updatedAt: LOADED_UPDATED_AT } });

    await result.current.handleConflictResolve({ 'lieuDeSurvenue.adresse.ville': 'server' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ situation: { updatedAt: SERVER_UPDATED_AT } });
    expect(patchedSituation(1).lieuDeSurvenue?.adresse?.ville).toBe('Lyon');
  });

  it('locks the save on the version loaded rather than on one a background refetch brought in', async () => {
    patch.mockResolvedValue(okResponse());

    const { result, rerender } = renderEditSession(LOADED_UPDATED_AT);

    rerender({ updatedAt: REFETCHED_UPDATED_AT });
    await result.current.handleSave(loadedSituation(), false, []);

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patchedJson(0).controls).toEqual({ situation: { updatedAt: LOADED_UPDATED_AT } });
  });

  it('uploads the attached files once, however many times the save is replayed', async () => {
    patch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = loadedSituation();

    await result.current.handleSave(withVille(loadedSituation(), 'Marseille'), false, [
      new File(['compte-rendu'], 'compte-rendu.pdf', { type: 'application/pdf' }),
    ]);
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));

    await result.current.handleConflictResolve({ 'lieuDeSurvenue.adresse.ville': 'current' });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));

    expect(upload).toHaveBeenCalledTimes(1);
    expect(patchedSituation(0).fait?.fileIds).toEqual(['file-new']);
    expect(patchedSituation(1).fait?.fileIds).toEqual(['file-new']);
  });

  it('creates a situation without any optimistic lock', async () => {
    post.mockResolvedValue(okResponse());

    const result = renderCreate();

    await result.current.handleSave(loadedSituation(), true, []);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect((post.mock.calls[0][0] as { json: Record<string, unknown> }).json.controls).toBeUndefined();
    expect(patch).not.toHaveBeenCalled();
  });
});
