import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useResolvedFeatureFlags } from './featureFlags.hook';

vi.mock('@/lib/api/fetchFeatureFlags', () => ({
  fetchResolvedFeatureFlags: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchResolvedFeatureFlags);

const createWrapper = (client: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('useResolvedFeatureFlags', () => {
  beforeEach(() => {
    useFeatureFlagStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('populates the store with resolved flags on success', async () => {
    mockedFetch.mockResolvedValueOnce({ UPDATE_BANNER: true });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useResolvedFeatureFlags(), { wrapper: createWrapper(client) });

    await waitFor(() => {
      expect(useFeatureFlagStore.getState().flags).toEqual({ UPDATE_BANNER: true });
    });
  });

  it('keeps previously resolved flags when a refetch fails', async () => {
    mockedFetch.mockResolvedValueOnce({ UPDATE_BANNER: true }).mockRejectedValueOnce(new Error('network error'));

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useResolvedFeatureFlags(), { wrapper: createWrapper(client) });

    await waitFor(() => {
      expect(useFeatureFlagStore.getState().flags).toEqual({ UPDATE_BANNER: true });
    });

    await result.current.refetch().catch(() => {});

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledTimes(2);
    });

    expect(useFeatureFlagStore.getState().flags).toEqual({ UPDATE_BANNER: true });
  });
});
