import { describe, expect, it, vi } from 'vitest';
import { fetchDirectionsServicesRows } from './fetchEntites';

const { directionsServicesGet } = vi.hoisted(() => ({
  directionsServicesGet: vi.fn(),
}));

vi.mock('@/lib/api/hc.ts', () => ({
  client: {
    entites: {
      admin: {
        'directions-services': {
          $get: directionsServicesGet,
        },
      },
    },
  },
}));

vi.mock('@/lib/api/tanstackQuery.ts', () => ({
  handleRequestErrors: vi.fn(),
}));

describe('fetchDirectionsServicesRows', () => {
  it('passes search query to the directions and services endpoint', async () => {
    directionsServicesGet.mockResolvedValueOnce({
      json: async () => ({ data: [] }),
    });

    await fetchDirectionsServicesRows({ search: 'direction test' });

    expect(directionsServicesGet).toHaveBeenCalledWith({
      query: { search: 'direction test' },
    });
  });

  it('returns top-level capabilities from the directions and services endpoint', async () => {
    directionsServicesGet.mockResolvedValueOnce({
      json: async () => ({
        data: [],
        capabilities: {
          canCreateDirection: true,
          canCreateService: false,
        },
      }),
    });

    const result = await fetchDirectionsServicesRows();

    expect(result).toEqual({
      data: [],
      capabilities: {
        canCreateDirection: true,
        canCreateService: false,
      },
    });
  });
});
