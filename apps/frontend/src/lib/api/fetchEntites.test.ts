import { describe, expect, it, vi } from 'vitest';
import { fetchDirectionsServicesList } from './fetchEntites';

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

describe('fetchDirectionsServicesList', () => {
  it('passes search query to the directions and services endpoint', async () => {
    directionsServicesGet.mockResolvedValueOnce({
      json: async () => ({ data: [] }),
    });

    await fetchDirectionsServicesList({ search: 'direction test' });

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

    const result = await fetchDirectionsServicesList();

    expect(result).toEqual({
      data: [],
      capabilities: {
        canCreateDirection: true,
        canCreateService: false,
      },
    });
  });
});
