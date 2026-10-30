import { describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { fetchStatisticsDashboard } from './fetchStatistics';

vi.mock('@/lib/api/hc', () => ({
  client: { statistics: { dashboard: { $get: vi.fn() } } },
}));

vi.mock('@/lib/api/tanstackQuery', () => ({ handleRequestErrors: vi.fn() }));

describe('fetchStatisticsDashboard', () => {
  it('hands the abort signal to the request, so a superseded filter stops the Metabase round trip', async () => {
    const $get = vi.mocked(client.statistics.dashboard.$get);
    $get.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ data: { tabs: [], cards: [] } }),
    } as unknown as Awaited<ReturnType<typeof $get>>);
    const controller = new AbortController();

    await fetchStatisticsDashboard({ domaineIds: 'SOCIAL' }, controller.signal);

    expect($get).toHaveBeenCalledWith({ query: { domaineIds: 'SOCIAL' } }, { init: { signal: controller.signal } });
  });
});
