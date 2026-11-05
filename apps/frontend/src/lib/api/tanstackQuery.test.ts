import { PERMISSION_ERROR } from '@sirena/common/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { HttpError, handleRequestErrors } from './tanstackQuery';

const invalidateQueries = vi.fn();
const fetchQuery = vi.fn();
const navigate = vi.fn();

vi.mock('@/lib/api/hc', () => ({ client: {} }));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueries(...args),
    fetchQuery: (...args: unknown[]) => fetchQuery(...args),
  },
}));

vi.mock('@/lib/router', () => ({
  router: { navigate: (...args: unknown[]) => navigate(...args) },
}));

vi.mock('@/lib/toastManager', () => ({ toastManager: { add: vi.fn() } }));

vi.mock('@/lib/sentryUser', () => ({ clearSentryUser: vi.fn() }));

const inactiveAccountResponse = () =>
  new Response(
    JSON.stringify({
      message: 'Account inactive',
      cause: { name: PERMISSION_ERROR.ACCOUNT_INACTIVE },
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('handleRequestErrors', () => {
  it('invalidates the profile query when the account turns out to be inactive', async () => {
    await expect(handleRequestErrors(inactiveAccountResponse())).rejects.toThrow(HttpError);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    // A stale profile would keep the inactive user on the page they were denied.
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: profileQueryOptions().queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] });
  });

  it('refetches the profile before redirecting to the inactive page', async () => {
    await expect(handleRequestErrors(inactiveAccountResponse())).rejects.toThrow(HttpError);

    expect(fetchQuery).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({ to: '/inactive', search: { redirect: window.location.pathname } });
    expect(invalidateQueries.mock.invocationCallOrder[0]).toBeLessThan(fetchQuery.mock.invocationCallOrder[0]);
    expect(fetchQuery.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
  });
});
