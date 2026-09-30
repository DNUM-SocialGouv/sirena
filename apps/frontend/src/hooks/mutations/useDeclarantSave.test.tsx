import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { notifyConflictPersistent, notifyConflictUnusable, notifySaveFailure } from '@/lib/api/saveError';
import { HttpError } from '@/lib/api/tanstackQuery';
import { MAX_AUTO_MERGE_REPLAYS } from '@/lib/conflictResolution';
import { formatDeclarantFromServer } from '@/lib/declarant';
import { useDeclarantSave } from './useDeclarantSave';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/api/saveError', () => ({
  notifyAutoMerge: vi.fn(),
  notifyConflictPersistent: vi.fn(),
  notifyConflictRefreshed: vi.fn(),
  notifyConflictUnusable: vi.fn(),
  notifySaveFailure: vi.fn(),
  notifySaveNetworkFailure: vi.fn(),
}));

vi.mock('@/lib/api/hc', () => ({
  client: { 'requetes-entite': { ':id': { declarant: { $patch: vi.fn() } } } },
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

const patch = vi.mocked(client['requetes-entite'][':id'].declarant.$patch);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const renderSave = (identiteUpdatedAt?: string) =>
  renderHook(() => useDeclarantSave({ requestId: 'req-1', identiteUpdatedAt, onRefetch: vi.fn() }), { wrapper }).result;

const renderEditSession = (updatedAt?: string) =>
  renderHook(
    ({ updatedAt: identiteUpdatedAt }: { updatedAt?: string }) =>
      useDeclarantSave({ requestId: 'req-1', identiteUpdatedAt, onRefetch: vi.fn() }),
    { wrapper, initialProps: { updatedAt } },
  );

const LOADED_UPDATED_AT = '2026-01-01T10:00:00.000Z';
const SERVER_UPDATED_AT = '2026-01-01T11:00:00.000Z';

const REFETCHED_UPDATED_AT = '2026-01-01T12:00:00.000Z';

const serverDeclarant = (prenom: string, nom = 'Lovelace') => ({
  estVictime: false,
  isTuteur: false,
  veutGarderAnonymat: null,
  commentaire: '',
  identite: { prenom, nom, email: '', telephone: '', civiliteId: null },
  adresse: null,
});

const conflictBody = (cause: Record<string, unknown>) => ({
  message: 'The declarant identity has been modified by another user.',
  cause: { kind: 'BUSINESS', ...cause },
});

const conflictResponse = (
  cause: Record<string, unknown> = { serverData: serverDeclarant('Grace'), serverUpdatedAt: SERVER_UPDATED_AT },
) =>
  new Response(JSON.stringify(conflictBody(cause)), {
    status: 409,
    headers: { 'Content-Type': 'application/json' },
  }) as never;

const autoMergeableResponse = () =>
  conflictResponse({ serverData: serverDeclarant('Ada', 'Byron'), serverUpdatedAt: SERVER_UPDATED_AT });

const okResponse = () =>
  new Response(JSON.stringify({ data: {} }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as never;

const patchedJson = (call: number) => (patch.mock.calls[call][0] as { json: Record<string, unknown> }).json;

describe('useDeclarantSave', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves on a 409 conflict instead of rejecting into an unhandled rejection', async () => {
    patch.mockResolvedValue(
      new Response(JSON.stringify({ conflictData: {}, message: 'The requete has been modified by another user.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    );

    const { handleSave } = renderSave().current;

    await expect(handleSave({ prenom: 'Ada' })).resolves.toBeUndefined();
  });

  it('still rejects on a non-conflict failure', async () => {
    patch.mockResolvedValue(new Response(null, { status: 500 }) as never);

    const { handleSave } = renderSave().current;

    await expect(handleSave({ prenom: 'Ada' })).rejects.toBeInstanceOf(HttpError);
  });

  it('hands a network failure to the save failure notifier', async () => {
    patch.mockRejectedValue(new TypeError('Failed to fetch'));

    const { handleSave } = renderSave().current;

    await expect(handleSave({ prenom: 'Ada' })).rejects.toBeInstanceOf(TypeError);
    expect(notifySaveFailure).toHaveBeenCalledWith(expect.any(TypeError));
  });

  it('hands an answered failure to the save failure notifier', async () => {
    patch.mockResolvedValue(new Response(null, { status: 500 }) as never);

    const { handleSave } = renderSave().current;

    await expect(handleSave({ prenom: 'Ada' })).rejects.toBeInstanceOf(HttpError);
    expect(notifySaveFailure).toHaveBeenCalledWith(expect.any(HttpError));
  });

  it('opens the resolution dialog on a field both sides changed', async () => {
    patch.mockResolvedValueOnce(conflictResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatDeclarantFromServer(serverDeclarant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));
    expect(result.current.conflicts).toEqual([
      expect.objectContaining({ field: 'prenom', originalValue: 'Ada', currentValue: 'Ida', serverValue: 'Grace' }),
    ]);
  });

  it('replays a resolved conflict against the version it was resolved from', async () => {
    patch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatDeclarantFromServer(serverDeclarant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));

    expect(patchedJson(0).controls).toEqual({ declarant: { updatedAt: LOADED_UPDATED_AT } });

    await result.current.handleConflictResolve({ prenom: 'server' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ declarant: { updatedAt: SERVER_UPDATED_AT } });
    expect(patchedJson(1).declarant).toMatchObject({ prenom: 'Grace' });
  });

  it('keeps the changes only the other user made when a conflict is arbitrated', async () => {
    patch
      .mockResolvedValueOnce(
        conflictResponse({ serverData: serverDeclarant('Grace', 'Byron'), serverUpdatedAt: SERVER_UPDATED_AT }),
      )
      .mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatDeclarantFromServer(serverDeclarant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));
    expect(result.current.conflicts).toHaveLength(1);

    await result.current.handleConflictResolve({ prenom: 'current' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).declarant).toMatchObject({ prenom: 'Ida', nom: 'Byron' });
  });

  it('locks a new save on the loaded version when the dialog was left unanswered', async () => {
    patch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatDeclarantFromServer(serverDeclarant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ declarant: { updatedAt: LOADED_UPDATED_AT } });
  });

  it('stops replaying once the automatic merges keep hitting a conflict', async () => {
    patch.mockImplementation(async () => autoMergeableResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatDeclarantFromServer(serverDeclarant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(notifyConflictPersistent).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledTimes(1 + MAX_AUTO_MERGE_REPLAYS);
    expect(result.current.showConflictDialog).toBe(false);
  });

  it('lets a new save start from a fresh replay budget', async () => {
    patch.mockImplementation(async () => autoMergeableResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatDeclarantFromServer(serverDeclarant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1 + MAX_AUTO_MERGE_REPLAYS));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2 * (1 + MAX_AUTO_MERGE_REPLAYS)));
  });

  it('reports a conflict whose payload carries no usable timestamp instead of replaying', async () => {
    patch.mockImplementation(async () => conflictResponse({ serverData: serverDeclarant('Ada', 'Byron') }));

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatDeclarantFromServer(serverDeclarant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(notifyConflictUnusable).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('rebases the reference data on the server version an automatic merge started from', async () => {
    patch.mockResolvedValueOnce(autoMergeableResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatDeclarantFromServer(serverDeclarant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(result.current.originalDataRef.current).toMatchObject({ nom: 'Byron', prenom: 'Ada' });
    expect(patchedJson(1).declarant).toMatchObject({ nom: 'Byron', prenom: 'Ida' });
  });
  it('locks the save on the version loaded rather than on one a background refetch brought in', async () => {
    patch.mockResolvedValue(okResponse());

    const { result, rerender } = renderEditSession(LOADED_UPDATED_AT);

    rerender({ updatedAt: REFETCHED_UPDATED_AT });
    await result.current.handleSave({ prenom: 'Ida' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patchedJson(0).controls).toEqual({ declarant: { updatedAt: LOADED_UPDATED_AT } });
  });

  it('locks the next save on the refreshed version once a save succeeded', async () => {
    patch.mockImplementation(async () => okResponse());

    const { result, rerender } = renderEditSession(LOADED_UPDATED_AT);

    await result.current.handleSave({ prenom: 'Ida' });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    rerender({ updatedAt: REFETCHED_UPDATED_AT });
    await result.current.handleSave({ prenom: 'Ada' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ declarant: { updatedAt: REFETCHED_UPDATED_AT } });
  });
});
