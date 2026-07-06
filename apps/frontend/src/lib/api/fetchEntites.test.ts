import { describe, expect, it, vi } from 'vitest';
import { createDirectionAdminLocal, fetchDirectionsServicesList } from './fetchEntites';

const { directionsServicesGet, directionsPost } = vi.hoisted(() => ({
  directionsServicesGet: vi.fn(),
  directionsPost: vi.fn(),
}));

vi.mock('@/lib/api/hc.ts', () => ({
  client: {
    entites: {
      admin: {
        'directions-services': {
          $get: directionsServicesGet,
          directions: {
            $post: directionsPost,
          },
        },
      },
    },
  },
}));

vi.mock('@/lib/api/tanstackQuery.ts', () => ({
  handleRequestErrors: vi.fn(),
}));

describe('createDirectionAdminLocal', () => {
  it('posts only local visible Direction fields', async () => {
    const input = {
      nomComplet: 'Direction Autonomie',
      label: 'DA',
      email: 'direction-autonomie@ars.fr',
      isActive: false,
    };
    directionsPost.mockResolvedValueOnce({
      json: async () => ({ data: { id: 'dir-autonomie', ...input } }),
    });

    const result = await createDirectionAdminLocal(input);

    expect(directionsPost).toHaveBeenCalledWith({ json: input });
    expect(result).toEqual({ id: 'dir-autonomie', ...input });
  });
});

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
