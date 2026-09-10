import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { HttpError } from '@/lib/api/tanstackQuery';
import { MAX_AUTO_MERGE_REPLAYS } from '@/lib/conflictResolution';
import { toastManager } from '@/lib/toastManager';
import { type RequeteDateTypeData, useRequeteDateTypeSave } from './useRequeteDateTypeSave';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/toastManager', () => ({
  toastManager: { add: vi.fn() },
}));

vi.mock('@/lib/api/hc', () => ({
  client: { 'requetes-entite': { ':id': { 'date-type': { $patch: vi.fn() } } } },
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
      if (response.ok) return;
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      throw new HttpError((body as { message?: string } | null)?.message || `HTTP ${response.status}`);
    }),
  };
});

const patch = vi.mocked(client['requetes-entite'][':id']['date-type'].$patch);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const formatFromServer = (serverData: unknown): RequeteDateTypeData => {
  const requete = serverData as Record<string, unknown>;
  return {
    receptionDate: (requete.receptionDate as string | null) ?? null,
    provenanceId: (requete.provenanceId as string | null) ?? null,
  };
};

const renderSave = (requeteUpdatedAt?: string) =>
  renderHook(
    () => useRequeteDateTypeSave({ requestId: 'req-1', requeteUpdatedAt, onRefetch: vi.fn(), formatFromServer }),
    { wrapper },
  ).result;

const renderEditSession = (updatedAt?: string) =>
  renderHook(
    ({ updatedAt: requeteUpdatedAt }: { updatedAt?: string }) =>
      useRequeteDateTypeSave({ requestId: 'req-1', requeteUpdatedAt, onRefetch: vi.fn(), formatFromServer }),
    { wrapper, initialProps: { updatedAt } },
  );

const LOADED_UPDATED_AT = '2026-01-01T10:00:00.000Z';
const SERVER_UPDATED_AT = '2026-01-01T11:00:00.000Z';

const REFETCHED_UPDATED_AT = '2026-01-01T12:00:00.000Z';

const LOADED_DATA: RequeteDateTypeData = { receptionDate: '2026-01-01', provenanceId: 'PROV_A' };

const serverRequete = (receptionDate: string, provenanceId = 'PROV_A') => ({ receptionDate, provenanceId });

const conflictResponse = (
  cause: Record<string, unknown> = { serverData: serverRequete('2026-03-03'), serverUpdatedAt: SERVER_UPDATED_AT },
) =>
  new Response(
    JSON.stringify({
      message: 'The requete has been modified by another user.',
      cause: { kind: 'BUSINESS', ...cause },
    }),
    { status: 409, headers: { 'Content-Type': 'application/json' } },
  ) as never;

const autoMergeableResponse = () =>
  conflictResponse({ serverData: serverRequete('2026-01-01', 'PROV_B'), serverUpdatedAt: SERVER_UPDATED_AT });

const okResponse = () =>
  new Response(JSON.stringify({ data: {} }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as never;

const patchedJson = (call: number) => (patch.mock.calls[call][0] as { json: Record<string, unknown> }).json;

describe('useRequeteDateTypeSave', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves on a 409 conflict instead of rejecting into an unhandled rejection', async () => {
    patch.mockResolvedValue(conflictResponse({}));

    const { handleSave } = renderSave().current;

    await expect(handleSave({ receptionDate: '2026-02-02' })).resolves.toBeUndefined();
  });

  it('surfaces the server message on a non-conflict failure', async () => {
    patch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'La date de réception est invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    );

    const { handleSave } = renderSave().current;

    await expect(handleSave({ receptionDate: '2026-02-02' })).rejects.toBeInstanceOf(HttpError);
    expect(toastManager.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Erreur', description: 'La date de réception est invalide.' }),
    );
  });

  it('opens the resolution dialog on a field both sides changed', async () => {
    patch.mockResolvedValueOnce(conflictResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = LOADED_DATA;

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });

    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));
    expect(result.current.conflicts).toEqual([
      expect.objectContaining({
        field: 'receptionDate',
        originalValue: '2026-01-01',
        currentValue: '2026-02-02',
        serverValue: '2026-03-03',
      }),
    ]);
  });

  it('replays a resolved conflict against the version it was resolved from', async () => {
    patch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = LOADED_DATA;

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));

    expect(patchedJson(0).controls).toEqual({ updatedAt: LOADED_UPDATED_AT });

    await result.current.handleConflictResolve({ receptionDate: 'server' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ updatedAt: SERVER_UPDATED_AT });
    expect(patchedJson(1).receptionDate).toBe('2026-03-03');
  });

  it('keeps the changes only the other user made when a conflict is arbitrated', async () => {
    patch
      .mockResolvedValueOnce(
        conflictResponse({ serverData: serverRequete('2026-03-03', 'PROV_B'), serverUpdatedAt: SERVER_UPDATED_AT }),
      )
      .mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = LOADED_DATA;

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));
    expect(result.current.conflicts).toHaveLength(1);

    await result.current.handleConflictResolve({ receptionDate: 'current' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1)).toMatchObject({ receptionDate: '2026-02-02', provenanceId: 'PROV_B' });
  });

  it('locks a new save on the loaded version when the dialog was left unanswered', async () => {
    patch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(okResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = LOADED_DATA;

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });
    await waitFor(() => expect(result.current.showConflictDialog).toBe(true));

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ updatedAt: LOADED_UPDATED_AT });
  });

  it('stops replaying once the automatic merges keep hitting a conflict', async () => {
    patch.mockImplementation(async () => autoMergeableResponse());

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = LOADED_DATA;

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });

    await waitFor(() =>
      expect(toastManager.add).toHaveBeenCalledWith(expect.objectContaining({ title: 'Conflit persistant' })),
    );
    expect(patch).toHaveBeenCalledTimes(1 + MAX_AUTO_MERGE_REPLAYS);
    expect(result.current.showConflictDialog).toBe(false);
  });

  it('reports a conflict whose payload carries no usable timestamp instead of replaying', async () => {
    patch.mockImplementation(async () => conflictResponse({ serverData: serverRequete('2026-01-01', 'PROV_B') }));

    const result = renderSave(LOADED_UPDATED_AT);
    result.current.originalDataRef.current = LOADED_DATA;

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });

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
    result.current.originalDataRef.current = LOADED_DATA;

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(result.current.originalDataRef.current).toEqual({ receptionDate: '2026-01-01', provenanceId: 'PROV_B' });
    expect(patchedJson(1)).toMatchObject({ receptionDate: '2026-02-02', provenanceId: 'PROV_B' });
  });
  it('locks the save on the version loaded rather than on one a background refetch brought in', async () => {
    patch.mockResolvedValue(okResponse());

    const { result, rerender } = renderEditSession(LOADED_UPDATED_AT);

    rerender({ updatedAt: REFETCHED_UPDATED_AT });
    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patchedJson(0).controls).toEqual({ updatedAt: LOADED_UPDATED_AT });
  });

  it('locks the next save on the refreshed version once a save succeeded', async () => {
    patch.mockImplementation(async () => okResponse());

    const { result, rerender } = renderEditSession(LOADED_UPDATED_AT);

    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-02-02' });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    rerender({ updatedAt: REFETCHED_UPDATED_AT });
    await result.current.handleSave({ ...LOADED_DATA, receptionDate: '2026-03-03' });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patchedJson(1).controls).toEqual({ updatedAt: REFETCHED_UPDATED_AT });
  });
});
