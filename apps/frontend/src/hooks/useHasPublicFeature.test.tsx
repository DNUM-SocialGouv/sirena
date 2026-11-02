import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useUserStore } from '@/stores/userStore';
import { useHasPublicFeature } from './useHasPublicFeature';

vi.mock('@/lib/api/fetchFeatureFlags', () => ({
  fetchPublicFeatureFlags: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPublicFeatureFlags);

const createWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const renderHasFeature = () =>
  renderHook(() => useHasPublicFeature('WARNING_BANNER', false), { wrapper: createWrapper() });

beforeEach(() => {
  useFeatureFlagStore.getState().reset();
  useUserStore.getState().updateIsLogged(false);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useHasPublicFeature', () => {
  it('reads the public endpoint while nobody is signed in', async () => {
    mockedFetch.mockResolvedValueOnce({ WARNING_BANNER: true });

    const { result } = renderHasFeature();

    expect(result.current).toBe(false);
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('falls back to the default when the public endpoint fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHasFeature();

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledOnce();
    });
    expect(result.current).toBe(false);
  });

  it('prefers the flag resolved for the signed in user', async () => {
    useUserStore.getState().updateIsLogged(true);
    useFeatureFlagStore.getState().setFlags({ WARNING_BANNER: true });

    const { result } = renderHasFeature();

    expect(result.current).toBe(true);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('keeps the flag off for a signed in user it is not resolved for', () => {
    useUserStore.getState().updateIsLogged(true);
    useFeatureFlagStore.getState().setFlags({ WARNING_BANNER: false });

    const { result } = renderHasFeature();

    expect(result.current).toBe(false);
  });
});
