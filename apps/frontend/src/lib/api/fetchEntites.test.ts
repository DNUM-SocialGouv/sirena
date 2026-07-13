import { describe, expect, it, vi } from 'vitest';
import {
  createDirectionAdminLocal,
  editDirectionServiceAdminLocal,
  fetchDirectionServiceAdminLocal,
  fetchDirectionsServicesList,
} from './fetchEntites';

const { directionServiceGet, directionServicePatch, directionsServicesGet, directionsPost } = vi.hoisted(() => ({
  directionServiceGet: vi.fn(),
  directionServicePatch: vi.fn(),
  directionsServicesGet: vi.fn(),
  directionsPost: vi.fn(),
}));

vi.mock('@/lib/api/hc.ts', () => ({
  client: {
    entites: {
      admin: {
        'directions-services': {
          $get: directionsServicesGet,
          ':id': {
            $get: directionServiceGet,
            $patch: directionServicePatch,
          },
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

describe('local Direction and Service editing', () => {
  it('loads and patches a target through the local id endpoint', async () => {
    const target = {
      id: 'service-pa',
      kind: 'service' as const,
      nomComplet: 'Service PA',
      label: 'PA',
      email: 'service-pa@ars.fr',
      isActive: false,
    };
    const input = { ...target, nomComplet: 'Service Personnes âgées', isActive: true };
    const { id: _id, kind: _kind, ...editInput } = input;
    directionServiceGet.mockResolvedValueOnce({ json: async () => ({ data: target }) });
    directionServicePatch.mockResolvedValueOnce({ json: async () => ({ data: input }) });

    await expect(fetchDirectionServiceAdminLocal('service-pa')).resolves.toEqual(target);
    await expect(editDirectionServiceAdminLocal('service-pa', editInput)).resolves.toEqual(input);
    expect(directionServiceGet).toHaveBeenCalledWith({ param: { id: 'service-pa' } });
    expect(directionServicePatch).toHaveBeenCalledWith({
      param: { id: 'service-pa' },
      json: editInput,
    });
  });
});

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
