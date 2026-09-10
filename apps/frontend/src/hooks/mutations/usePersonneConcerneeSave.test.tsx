import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { HttpError } from '@/lib/api/tanstackQuery';
import { MAX_AUTO_MERGE_REPLAYS } from '@/lib/conflictResolution';
import { formatPersonneConcerneeFromServer } from '@/lib/personneConcernee';
import { toastManager } from '@/lib/toastManager';
import { usePersonneConcerneeSave } from './usePersonneConcerneeSave';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/toastManager', () => ({
  toastManager: { add: vi.fn() },
}));

vi.mock('@/lib/api/hc', () => ({
  client: { 'requetes-entite': { ':id': { participant: { $patch: vi.fn() } } } },
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

const patch = vi.mocked(client['requetes-entite'][':id'].participant.$patch);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const renderSave = (participantUpdatedAt?: string) =>
  renderHook(() => usePersonneConcerneeSave({ requestId: 'req-1', participantUpdatedAt, onRefetch: vi.fn() }), {
    wrapper,
  }).result;

const renderEditSession = (updatedAt?: string) =>
  renderHook(
    ({ updatedAt: participantUpdatedAt }: { updatedAt?: string }) =>
      usePersonneConcerneeSave({ requestId: 'req-1', participantUpdatedAt, onRefetch: vi.fn() }),
    { wrapper, initialProps: { updatedAt } },
  );

const LOADED_UPDATED_AT = '2026-01-01T10:00:00.000Z';
const SERVER_UPDATED_AT = '2026-01-01T11:00:00.000Z';

const REFETCHED_UPDATED_AT = '2026-01-01T12:00:00.000Z';

const serverParticipant = (prenom: string, nom = 'Lovelace') => ({
  identite: { prenom, nom, email: '', telephone: '', civiliteId: null },
  adresse: null,
  age: null,
  dateNaissance: null,
  estHandicapee: null,
  veutGarderAnonymat: null,
  estVictimeInformee: null,
  victimeInformeeCommentaire: '',
  autrePersonnes: '',
  aAutrePersonnes: null,
  mesureProtection: null,
  commentaire: '',
});

const conflictResponse = (
  cause: Record<string, unknown> = { serverData: serverParticipant('Grace'), serverUpdatedAt: SERVER_UPDATED_AT },
) =>
  new Response(
    JSON.stringify({
      message: 'The participant has been modified by another user.',
      cause: { kind: 'BUSINESS', ...cause },
    }),
    { status: 409, headers: { 'Content-Type': 'application/json' } },
  ) as never;

const autoMergeableResponse = () =>
  conflictResponse({ serverData: serverParticipant('Ada', 'Byron'), serverUpdatedAt: SERVER_UPDATED_AT });

const okResponse = () =>
  new Response(JSON.stringify({ data: {} }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as never;

const patchedJson = (call: number) => (patch.mock.calls[call][0] as { json: Record<string, unknown> }).json;

describe('usePersonneConcerneeSave', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves on a 409 conflict instead of rejecting into an unhandled rejection', async () => {
    patch.mockResolvedValue(conflictResponse({}));

    const { handleSave } = renderSave().current;

    await expect(handleSave({ prenom: 'Ada' })).resolves.toBeUndefined();
  });

  it('still rejects on a non-conflict failure', async () => {
    patch.mockResolvedValue(new Response(null, { status: 500 }) as never);

    const { handleSave } = renderSave().current;

    await expect(handleSave({ prenom: 'Ada' })).rejects.toBeInstanceOf(HttpError);
  });

  it('opens the resolution dialog on a field both sides changed', async () => {
    patch.mockResolvedValueOnce(conflictResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatPersonneConcerneeFromServer(serverParticipant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));
    expect(result.current.conflicts).toEqual([
      expect.objectContaining({ field: 'prenom', originalValue: 'Ada', currentValue: 'Ida', serverValue: 'Grace' }),
    ]);
  });

  it('replays a resolved conflict against the version it was resolved from', async () => {
    patch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatPersonneConcerneeFromServer(serverParticipant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));

    expect(patchedJson(0).controls).toEqual({ participant: { updatedAt: LOADED_UPDATED_AT } });

    await result.current.handleConflictResolve({ prenom: 'server' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ participant: { updatedAt: SERVER_UPDATED_AT } });
    expect(patchedJson(1).participant).toMatchObject({ prenom: 'Grace' });
  });

  it('keeps the changes only the other user made when a conflict is arbitrated', async () => {
    patch
      .mockResolvedValueOnce(
        conflictResponse({ serverData: serverParticipant('Grace', 'Byron'), serverUpdatedAt: SERVER_UPDATED_AT }),
      )
      .mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatPersonneConcerneeFromServer(serverParticipant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));
    expect(result.current.conflicts).toHaveLength(1);

    await result.current.handleConflictResolve({ prenom: 'current' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).participant).toMatchObject({ prenom: 'Ida', nom: 'Byron' });
  });

  it('locks a new save on the loaded version when the dialog was left unanswered', async () => {
    patch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatPersonneConcerneeFromServer(serverParticipant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ participant: { updatedAt: LOADED_UPDATED_AT } });
  });

  it('stops replaying once the automatic merges keep hitting a conflict', async () => {
    patch.mockImplementation(async () => autoMergeableResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatPersonneConcerneeFromServer(serverParticipant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() =>
      expect(toastManager.add).toHaveBeenCalledWith(expect.objectContaining({ title: 'Conflit persistant' })),
    );
    expect(patch).toHaveBeenCalledTimes(1 + MAX_AUTO_MERGE_REPLAYS);
    expect(result.current.showConflictDialog).toBe(false);
  });

  it('reports a conflict whose payload carries no usable timestamp instead of replaying', async () => {
    patch.mockImplementation(async () => conflictResponse({ serverData: serverParticipant('Ada', 'Byron') }));

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatPersonneConcerneeFromServer(serverParticipant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() =>
      expect(toastManager.add).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Conflit de données', data: { icon: 'fr-alert--error' } }),
      ),
    );
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('rebases the reference data on the server version an automatic merge started from', async () => {
    patch.mockResolvedValueOnce(autoMergeableResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = formatPersonneConcerneeFromServer(serverParticipant('Ada'));

    await result.current.handleSave({ ...result.current.originalDataRef.current, prenom: 'Ida' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(result.current.originalDataRef.current).toMatchObject({ nom: 'Byron', prenom: 'Ada' });
    expect(patchedJson(1).participant).toMatchObject({ nom: 'Byron', prenom: 'Ida' });
  });
  it('locks the save on the version loaded rather than on one a background refetch brought in', async () => {
    patch.mockResolvedValue(okResponse());

    const { result, rerender } = renderEditSession(LOADED_UPDATED_AT);

    rerender({ updatedAt: REFETCHED_UPDATED_AT });
    await result.current.handleSave({ prenom: 'Ida' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patchedJson(0).controls).toEqual({ participant: { updatedAt: LOADED_UPDATED_AT } });
  });

  it('locks the next save on the refreshed version once a save succeeded', async () => {
    patch.mockImplementation(async () => okResponse());

    const { result, rerender } = renderEditSession(LOADED_UPDATED_AT);

    await result.current.handleSave({ prenom: 'Ida' });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    rerender({ updatedAt: REFETCHED_UPDATED_AT });
    await result.current.handleSave({ prenom: 'Ada' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ participant: { updatedAt: REFETCHED_UPDATED_AT } });
  });
});
