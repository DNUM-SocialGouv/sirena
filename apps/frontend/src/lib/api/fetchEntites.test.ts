import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDirectionAdminLocal,
  createServiceAdminLocal,
  editDirectionServiceAdminLocal,
  editEntiteAdministrativeAdminLocal,
  fetchDirectionServiceAdminLocal,
  fetchDirectionsServicesList,
} from './fetchEntites';

const {
  directionServiceGet,
  directionServicePatch,
  directionsServicesGet,
  directionsPost,
  entiteAdministrativePatch,
  handleRequestErrorsSpy,
  servicesPost,
} = vi.hoisted(() => ({
  directionServiceGet: vi.fn(),
  directionServicePatch: vi.fn(),
  directionsServicesGet: vi.fn(),
  directionsPost: vi.fn(),
  entiteAdministrativePatch: vi.fn(),
  handleRequestErrorsSpy: vi.fn(),
  servicesPost: vi.fn(),
}));

vi.mock('@/lib/api/hc.ts', () => ({
  client: {
    entites: {
      admin: {
        local: { $patch: entiteAdministrativePatch },
        'directions-services': {
          $get: directionsServicesGet,
          ':id': { $get: directionServiceGet, $patch: directionServicePatch },
          directions: { $post: directionsPost },
          services: { $post: servicesPost },
        },
      },
    },
  },
}));
vi.mock('@/lib/api/tanstackQuery.ts', () => ({ handleRequestErrors: handleRequestErrorsSpy }));

const visibleInput = {
  nomComplet: 'Direction Autonomie',
  label: 'DA',
  email: 'direction-autonomie@ars.fr',
  emailContactUsager: 'contact-autonomie@ars.fr',
  telContactUsager: '0102030405',
  adresseContactUsager: '1 rue de la Santé, Paris',
};

beforeEach(() => vi.clearAllMocks());

describe('local Entité administrative API adapter', () => {
  it('patches the authenticated assignment with exactly the six visible fields and no identifier', async () => {
    const updatedEntite = { id: 'root-ars', ...visibleInput };
    entiteAdministrativePatch.mockResolvedValueOnce({ json: async () => ({ data: updatedEntite }) });

    await expect(editEntiteAdministrativeAdminLocal(visibleInput)).resolves.toEqual(updatedEntite);
    expect(entiteAdministrativePatch).toHaveBeenCalledWith({ json: visibleInput });
    expect(handleRequestErrorsSpy).toHaveBeenCalledWith(expect.anything(), { silentToastError: true });
  });
});

describe('local Direction and Service API adapter', () => {
  it('loads and patches an edit target through its local endpoint', async () => {
    const target = {
      id: 'service-pa',
      entiteType: 'service' as const,
      ...visibleInput,
      parentDirection: { id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' },
    };
    const editInput = { ...visibleInput, nomComplet: 'Service Personnes âgées' };
    directionServiceGet.mockResolvedValueOnce({ json: async () => ({ data: target }) });
    directionServicePatch.mockResolvedValueOnce({ json: async () => ({ data: { ...target, ...editInput } }) });

    await expect(fetchDirectionServiceAdminLocal(target.id)).resolves.toEqual(target);
    await expect(editDirectionServiceAdminLocal(target.id, editInput)).resolves.toEqual({ ...target, ...editInput });
    expect(directionServiceGet).toHaveBeenCalledWith({ param: { id: target.id } });
    expect(directionServicePatch).toHaveBeenCalledWith({ param: { id: target.id }, json: editInput });
  });

  it('posts only visible fields to the Direction and Service creation endpoints', async () => {
    directionsPost.mockResolvedValueOnce({ json: async () => ({ data: { id: 'dir-autonomie', ...visibleInput } }) });
    servicesPost.mockResolvedValueOnce({ json: async () => ({ data: { id: 'service-autonomie', ...visibleInput } }) });

    await expect(createDirectionAdminLocal(visibleInput)).resolves.toEqual({ id: 'dir-autonomie', ...visibleInput });
    await expect(createServiceAdminLocal(visibleInput)).resolves.toEqual({ id: 'service-autonomie', ...visibleInput });
    expect(directionsPost).toHaveBeenCalledWith({ json: visibleInput });
    expect(servicesPost).toHaveBeenCalledWith({ json: visibleInput });
  });

  it('passes search and returns list capabilities, available Directions and parent context', async () => {
    const response = {
      data: [],
      capabilities: { canCreateDirection: true, canCreateService: true },
      availableDirections: [{ id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' }],
      serviceParentDirection: null,
    };
    directionsServicesGet.mockResolvedValueOnce({ json: async () => response });

    await expect(fetchDirectionsServicesList({ search: 'direction test' })).resolves.toEqual(response);
    expect(directionsServicesGet).toHaveBeenCalledWith({ query: { search: 'direction test' } });
  });

  it('defaults optional list context omitted by an older response', async () => {
    directionsServicesGet.mockResolvedValueOnce({
      json: async () => ({ data: [], capabilities: { canCreateDirection: false, canCreateService: false } }),
    });

    await expect(fetchDirectionsServicesList()).resolves.toEqual({
      data: [],
      capabilities: { canCreateDirection: false, canCreateService: false },
      availableDirections: [],
      serviceParentDirection: null,
    });
  });
});
