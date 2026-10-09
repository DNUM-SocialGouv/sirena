import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifySaveNetworkFailure } from '@/lib/api/saveError';
import { HttpError } from '@/lib/api/tanstackQuery';
import { queryClient } from '@/lib/queryClient';
import { usePatchUser } from './updateUser.hook';

const patchUserById = vi.fn();

vi.mock('@/lib/api/fetchUsers', () => ({
  patchUserById: (...args: unknown[]) => patchUserById(...args),
  fetchUserById: vi.fn(),
}));

vi.mock('@/lib/api/saveError', () => ({
  notifySaveNetworkFailure: vi.fn(),
}));

vi.mock('@/lib/api/tanstackQuery', () => {
  class HttpError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'HttpError';
      this.status = status;
    }
  }
  return { HttpError, handleRequestErrors: vi.fn() };
});

vi.mock('@/lib/queryClient', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) };
});

const PREVIOUS_USER = { id: 'u-1', roleId: 'READER', statutId: 'ACTIF', entiteId: 'e-1' };
const PATCH = { roleId: 'WRITER', statutId: 'ACTIF', entiteId: 'e-2' };

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderPatchUser = () => renderHook(() => usePatchUser(), { wrapper }).result;

afterEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
});

describe('usePatchUser', () => {
  it('tells the user when the request never reached the server', async () => {
    queryClient.setQueryData(['user', 'u-1'], PREVIOUS_USER);
    patchUserById.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = renderPatchUser();
    result.current.mutate({ id: 'u-1', json: PATCH });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(notifySaveNetworkFailure).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['user', 'u-1'])).toEqual(PREVIOUS_USER);
  });

  it('leaves an HTTP failure to the toast handleRequestErrors already raised', async () => {
    queryClient.setQueryData(['user', 'u-1'], PREVIOUS_USER);
    patchUserById.mockRejectedValue(new HttpError('boom', 500));

    const result = renderPatchUser();
    result.current.mutate({ id: 'u-1', json: PATCH });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(notifySaveNetworkFailure).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(['user', 'u-1'])).toEqual(PREVIOUS_USER);
  });

  it('never writes the submitted values to the cache before the server confirms', async () => {
    queryClient.setQueryData(['user', 'u-1'], PREVIOUS_USER);
    let settle: (user: typeof PREVIOUS_USER) => void = () => {};
    patchUserById.mockReturnValue(
      new Promise<typeof PREVIOUS_USER>((resolve) => {
        settle = resolve;
      }),
    );

    const result = renderPatchUser();
    result.current.mutate({ id: 'u-1', json: PATCH });

    // An optimistic write would be rolled back on failure, and the rollback re-seeds
    // the form from the cache: the admin would lose what they had just entered.
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(queryClient.getQueryData(['user', 'u-1'])).toEqual(PREVIOUS_USER);

    settle({ ...PREVIOUS_USER, ...PATCH });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('keeps the server answer on success', async () => {
    const saved = { ...PREVIOUS_USER, ...PATCH };
    patchUserById.mockResolvedValue(saved);

    const result = renderPatchUser();
    result.current.mutate({ id: 'u-1', json: PATCH });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notifySaveNetworkFailure).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(['user', 'u-1'])).toEqual(saved);
  });
});
