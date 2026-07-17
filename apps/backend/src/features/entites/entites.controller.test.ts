import { ERROR_KIND, ROLES } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { Prisma } from '../../libs/prisma.js';
import pinoLogger from '../../middlewares/pino.middleware.js';
import EntitesController from './entites.controller.js';
import { EntiteChildCreationForbiddenError, EntiteNotFoundError } from './entites.error.js';
import {
  createDirectionAdminLocal,
  createServiceAdminLocal,
  editDirectionServiceAdminLocal,
  getDirectionServiceAdminLocal,
  getDirectionsServicesList,
  getEditableEntitiesChain,
  getEntiteById,
  getEntites,
  getEntitesListAdmin,
  getRootEntitesListAdmin,
} from './entites.service.js';

vi.mock('../../config/env.js', () => ({
  envVars: {},
}));

vi.mock('./entites.service.js', () => ({
  getEntites: vi.fn(),
  getEntiteById: vi.fn(),
  getEntitesListAdmin: vi.fn(),
  getDirectionsServicesList: vi.fn(),
  getDirectionServiceAdminLocal: vi.fn(),
  editDirectionServiceAdminLocal: vi.fn(),
  getRootEntitesListAdmin: vi.fn(),
  getEditableEntitiesChain: vi.fn(),
  editEntiteAdmin: editEntiteAdminSpy,
  createChildEntiteAdmin: createChildEntiteAdminSpy,
  createDirectionAdminLocal: createDirectionAdminLocalSpy,
  createServiceAdminLocal: createServiceAdminLocalSpy,
}));

vi.mock('../../middlewares/auth.middleware.js', () => {
  return {
    default: async (c: Context, next: Next) => {
      c.set('userId', 'id1');
      return next();
    },
  };
});

vi.mock('../../middlewares/userStatus.middleware.js', () => {
  return {
    default: (_: Context, next: Next) => {
      return next();
    },
  };
});

const {
  roleMiddlewareSpy,
  currentRole,
  hasFeatureSpy,
  getUserByIdSpy,
  patchEntiteAdminByIdSpy: editEntiteAdminSpy,
  postChildEntiteAdminSpy: createChildEntiteAdminSpy,
  createDirectionAdminLocalSpy,
  createServiceAdminLocalSpy,
  assignedEntiteIdState,
} = vi.hoisted(() => ({
  roleMiddlewareSpy: vi.fn(),
  currentRole: { value: 'SUPER_ADMIN' },
  hasFeatureSpy: vi.fn(),
  getUserByIdSpy: vi.fn(),
  patchEntiteAdminByIdSpy: vi.fn(),
  postChildEntiteAdminSpy: vi.fn(),
  createDirectionAdminLocalSpy: vi.fn(),
  createServiceAdminLocalSpy: vi.fn(),
  assignedEntiteIdState: { value: 'dir-autonomie' as string | undefined },
}));

vi.mock('../featureFlags/featureFlags.service.js', () => ({
  hasFeature: hasFeatureSpy,
}));

vi.mock('../users/users.service.js', () => ({
  getUserById: getUserByIdSpy,
}));

vi.mock('../../middlewares/role.middleware.js', () => {
  return {
    default: (roles: string[]) => {
      roleMiddlewareSpy(roles);
      return async (c: Context, next: Next) => {
        if (!roles.includes(currentRole.value)) {
          return c.json({ message: 'Forbidden' }, 403);
        }

        return next();
      };
    },
  };
});

vi.mock('../../middlewares/entites.middleware.js', () => {
  return {
    default: async (c: Context, next: Next) => {
      c.set('entiteIds', ['dir-autonomie', 'service-pa']);
      c.set('assignedEntiteId', assignedEntiteIdState.value);
      c.set('topEntiteId', 'root-ars');
      return next();
    },
  };
});

describe('Entites endpoints: /entites', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', EntitesController).onError(errorHandler);
  const client = testClient(app);

  const mockEntite = {
    id: '2',
    label: 'b',
    email: 'test2@domain.fr',
    emailContactUsager: '',
    telContactUsager: '',
    adresseContactUsager: '',
    entiteTypeId: 'ENTITE_TYPE_A',
    entiteMereId: null,
    nomComplet: 'Entite B',
    organizationalUnit: 'ARS-CORSE',
    emailDomain: '',
    departementCode: '12',
    ctcdCode: '123',
    regionCode: '123',
    regLib: 'Region 1',
    dptLib: 'Departement 1',
    isActive: false,
  };

  beforeEach(() => {
    currentRole.value = ROLES.SUPER_ADMIN;
    assignedEntiteIdState.value = 'dir-autonomie';
    vi.clearAllMocks();
    hasFeatureSpy.mockResolvedValue(true);
    getUserByIdSpy.mockResolvedValue({ email: 'entity-admin@example.gouv.fr', entiteId: 'dir-autonomie' });
  });

  describe('GET /admin', () => {
    it('rejects non SUPER_ADMIN users with 403', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;

      const res = await client.admin.$get({
        query: { offset: '0', limit: '10' },
      });

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ message: 'Forbidden' });
      expect(getEntitesListAdmin).not.toHaveBeenCalled();
    });

    it('passes rootEntiteIds query param to admin entities list service', async () => {
      vi.mocked(getEntitesListAdmin).mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      const res = await client.admin.$get({
        query: { offset: '20', limit: '10', rootEntiteIds: 'root-ars,root-dd' },
      });

      expect(res.status).toBe(200);
      expect(getEntitesListAdmin).toHaveBeenCalledWith({
        offset: 20,
        limit: 10,
        rootEntiteIds: ['root-ars', 'root-dd'],
      });
    });

    it('returns admin entities list with pagination metadata for SUPER_ADMIN', async () => {
      vi.mocked(getEntitesListAdmin).mockResolvedValueOnce({
        data: [
          {
            id: 'root-ars',
            entiteNom: 'ARS Normandie',
            entiteLabel: 'ARS NOR',
            directionNom: '',
            directionLabel: '',
            serviceNom: '',
            serviceLabel: '',
            email: '',
            contactUsager: 'contact@ars.fr · 01 02 03 04 05',
            isActiveLabel: 'Oui',
            editId: 'root-ars',
          },
        ],
        total: 1,
      });

      const res = await client.admin.$get({
        query: { offset: '0', limit: '10' },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [
          {
            id: 'root-ars',
            entiteNom: 'ARS Normandie',
            entiteLabel: 'ARS NOR',
            directionNom: '',
            directionLabel: '',
            serviceNom: '',
            serviceLabel: '',
            email: '',
            contactUsager: 'contact@ars.fr · 01 02 03 04 05',
            isActiveLabel: 'Oui',
            editId: 'root-ars',
          },
        ],
        meta: {
          offset: 0,
          limit: 10,
          total: 1,
        },
      });

      expect(getEntitesListAdmin).toHaveBeenCalledWith({
        offset: 0,
        limit: 10,
      });
    });
  });

  describe('GET /admin/directions-services', () => {
    it('rejects entity admins when the local directions and services feature flag is disabled', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      hasFeatureSpy.mockResolvedValueOnce(false);

      const res = await app.request('/admin/directions-services');

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ message: 'Forbidden' });
      expect(hasFeatureSpy).toHaveBeenCalledWith(
        'ADMIN_LOCAL_DIRECTIONS_SERVICES',
        false,
        'entity-admin@example.gouv.fr',
        'dir-autonomie',
      );
      expect(getDirectionsServicesList).not.toHaveBeenCalled();
    });

    it('scopes local directions and services list from the assigned entity', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      vi.mocked(getDirectionsServicesList).mockResolvedValueOnce({
        data: [
          {
            id: 'dir-autonomie',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-autonomie@ars.fr',
            editId: 'dir-autonomie',
            canEdit: true,
          },
        ],
        capabilities: {
          canCreateDirection: false,
          canCreateService: true,
        },
        availableDirections: [],
        serviceParentDirection: {
          id: 'dir-autonomie',
          nomComplet: 'Direction Autonomie',
          label: 'DA',
        },
      });

      const res = await app.request('/admin/directions-services');

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [
          {
            id: 'dir-autonomie',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-autonomie@ars.fr',
            editId: 'dir-autonomie',
            canEdit: true,
          },
        ],
        capabilities: {
          canCreateDirection: false,
          canCreateService: true,
        },
        availableDirections: [],
        serviceParentDirection: {
          id: 'dir-autonomie',
          nomComplet: 'Direction Autonomie',
          label: 'DA',
        },
      });
      expect(getDirectionsServicesList).toHaveBeenCalledWith('dir-autonomie', { search: '' });
    });

    it('returns available Directions for an Entité-administrative assignment', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      assignedEntiteIdState.value = 'root-ars';
      vi.mocked(getDirectionsServicesList).mockResolvedValueOnce({
        data: [],
        capabilities: {
          canCreateDirection: true,
          canCreateService: true,
        },
        availableDirections: [{ id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' }],
        serviceParentDirection: null,
      });

      const res = await app.request('/admin/directions-services');

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [],
        capabilities: {
          canCreateDirection: true,
          canCreateService: true,
        },
        availableDirections: [{ id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' }],
        serviceParentDirection: null,
      });
    });

    it('passes search query to local directions and services list service', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      vi.mocked(getDirectionsServicesList).mockResolvedValueOnce({
        data: [],
        capabilities: {
          canCreateDirection: false,
          canCreateService: true,
        },
        availableDirections: [],
        serviceParentDirection: {
          id: 'dir-autonomie',
          nomComplet: 'Direction Autonomie',
          label: 'DA',
        },
      });

      const res = await app.request('/admin/directions-services?search=autonomie');

      expect(res.status).toBe(200);
      expect(getDirectionsServicesList).toHaveBeenCalledWith('dir-autonomie', { search: 'autonomie' });
    });
  });

  describe('GET /admin/directions-services/:id', () => {
    it('returns an authorized local edit target and hides a denied target', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      vi.mocked(getDirectionServiceAdminLocal)
        .mockResolvedValueOnce({
          id: 'service-pa',
          kind: 'service',
          nomComplet: 'Service PA',
          label: 'PA',
          email: 'service-pa@ars.fr',
          emailContactUsager: 'contact-pa@ars.fr',
          telContactUsager: '0102030405',
          adresseContactUsager: '1 rue de la Santé, Paris',
          parentDirection: {
            id: 'dir-autonomie',
            nomComplet: 'Direction Autonomie',
            label: 'DA',
          },
        })
        .mockResolvedValueOnce(null);

      const authorizedRes = await app.request('/admin/directions-services/service-pa');
      const deniedRes = await app.request('/admin/directions-services/service-outside');

      expect(authorizedRes.status).toBe(200);
      expect(await authorizedRes.json()).toEqual({
        data: {
          id: 'service-pa',
          kind: 'service',
          nomComplet: 'Service PA',
          label: 'PA',
          email: 'service-pa@ars.fr',
          emailContactUsager: 'contact-pa@ars.fr',
          telContactUsager: '0102030405',
          adresseContactUsager: '1 rue de la Santé, Paris',
          parentDirection: {
            id: 'dir-autonomie',
            nomComplet: 'Direction Autonomie',
            label: 'DA',
          },
        },
      });
      expect(deniedRes.status).toBe(404);
      expect(getDirectionServiceAdminLocal).toHaveBeenNthCalledWith(1, 'dir-autonomie', 'service-pa');
      expect(getDirectionServiceAdminLocal).toHaveBeenNthCalledWith(2, 'dir-autonomie', 'service-outside');
    });
  });

  describe('PATCH /admin/directions-services/:id', () => {
    it('updates an authorized local target and hides a denied target', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      const input = {
        nomComplet: 'Service Personnes âgées',
        label: 'PA',
        email: 'notification-pa@ars.fr',
        emailContactUsager: 'contact-pa@ars.fr',
        telContactUsager: '0102030405',
        adresseContactUsager: '1 rue de la Santé, Paris',
      };
      vi.mocked(editDirectionServiceAdminLocal)
        .mockResolvedValueOnce({
          id: 'service-pa',
          kind: 'service',
          ...input,
          parentDirection: {
            id: 'dir-autonomie',
            nomComplet: 'Direction Autonomie',
            label: 'DA',
          },
        })
        .mockResolvedValueOnce(null);

      const authorizedRes = await app.request('/admin/directions-services/service-pa', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const deniedRes = await app.request('/admin/directions-services/service-outside', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });

      expect(authorizedRes.status).toBe(200);
      expect(await authorizedRes.json()).toEqual({
        data: {
          id: 'service-pa',
          kind: 'service',
          ...input,
          parentDirection: {
            id: 'dir-autonomie',
            nomComplet: 'Direction Autonomie',
            label: 'DA',
          },
        },
      });
      expect(deniedRes.status).toBe(404);
      expect(editDirectionServiceAdminLocal).toHaveBeenNthCalledWith(1, 'dir-autonomie', 'service-pa', input);
      expect(editDirectionServiceAdminLocal).toHaveBeenNthCalledWith(2, 'dir-autonomie', 'service-outside', input);
    });

    it('rejects caller-controlled status and Service parent changes', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      const input = {
        nomComplet: 'Service Personnes âgées',
        label: 'PA',
        email: 'notification-pa@ars.fr',
        emailContactUsager: 'contact-pa@ars.fr',
        telContactUsager: '0102030405',
        adresseContactUsager: '1 rue de la Santé, Paris',
      };

      for (const forbiddenField of [{ isActive: false }, { directionId: 'dir-enfance' }]) {
        vi.mocked(editDirectionServiceAdminLocal).mockClear();
        const res = await app.request('/admin/directions-services/service-pa', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...input, ...forbiddenField }),
        });

        expect(res.status).toBe(400);
        expect(editDirectionServiceAdminLocal).not.toHaveBeenCalled();
      }
    });
  });

  describe('POST /admin/directions-services/directions', () => {
    it('rejects entity admins when the local directions and services feature flag is disabled', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      hasFeatureSpy.mockResolvedValueOnce(false);

      const res = await app.request('/admin/directions-services/directions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          nomComplet: 'Direction Autonomie',
          label: 'DA',
          email: 'direction-autonomie@ars.fr',
          isActive: false,
        }),
      });

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ message: 'Forbidden' });
      expect(createDirectionAdminLocal).not.toHaveBeenCalled();
    });

    it('creates a Direction from the assigned entite administrative for ENTITY_ADMIN', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      const createDirectionPayload = {
        nomComplet: 'Direction Autonomie',
        label: 'DA',
        email: 'direction-autonomie@ars.fr',
        emailContactUsager: 'contact-usager@direction.fr',
        adresseContactUsager: '1 rue de la République, 75000 Paris',
        telContactUsager: '0102030405',
      };
      vi.mocked(createDirectionAdminLocal).mockResolvedValueOnce({
        id: 'dir-autonomie',
        ...createDirectionPayload,
        isActive: true,
      });

      const res = await app.request('/admin/directions-services/directions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(createDirectionPayload),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          id: 'dir-autonomie',
          ...createDirectionPayload,
          isActive: true,
        },
      });
      expect(createDirectionAdminLocal).toHaveBeenCalledWith('dir-autonomie', createDirectionPayload);
    });

    it('rejects caller-controlled active status', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;

      const res = await app.request('/admin/directions-services/directions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          nomComplet: 'Direction Autonomie',
          label: 'DA',
          email: 'direction-autonomie@ars.fr',
          isActive: false,
        }),
      });

      expect(res.status).toBe(400);
      expect(createDirectionAdminLocal).not.toHaveBeenCalled();
    });

    it('returns 400 when local Direction creation is forbidden for the assigned entity', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      const createDirectionPayload = {
        nomComplet: 'Direction Autonomie',
        label: 'DA',
        email: 'direction-autonomie@ars.fr',
      };
      vi.mocked(createDirectionAdminLocal).mockRejectedValueOnce(new EntiteChildCreationForbiddenError());

      const res = await app.request('/admin/directions-services/directions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(createDirectionPayload),
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: 'Child entite creation is not allowed for this parent',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(createDirectionAdminLocal).toHaveBeenCalledWith('dir-autonomie', {
        ...createDirectionPayload,
        emailContactUsager: '',
        adresseContactUsager: '',
        telContactUsager: '',
      });
    });

    it('returns 400 without calling the service when no assigned entity is available', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      assignedEntiteIdState.value = undefined;
      const createDirectionPayload = {
        nomComplet: 'Direction Autonomie',
        label: 'DA',
        email: 'direction-autonomie@ars.fr',
      };

      const res = await app.request('/admin/directions-services/directions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(createDirectionPayload),
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: 'Assigned entite is required to create a Direction',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(createDirectionAdminLocal).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/directions-services/services', () => {
    it('forwards every visible Service contact field and creates it active under the assigned Direction', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      const visiblePayload = {
        nomComplet: 'Service Autonomie',
        label: 'SA',
        email: 'service-autonomie@ars.fr',
        emailContactUsager: 'contact-autonomie@ars.fr',
        adresseContactUsager: '1 rue de la Santé, Paris',
        telContactUsager: '0102030405',
      };
      vi.mocked(createServiceAdminLocal).mockResolvedValueOnce({
        id: 'service-autonomie',
        ...visiblePayload,
        isActive: true,
      });

      const res = await app.request('/admin/directions-services/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(visiblePayload),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          id: 'service-autonomie',
          ...visiblePayload,
          isActive: true,
        },
      });
      expect(createServiceAdminLocal).toHaveBeenCalledWith('dir-autonomie', visiblePayload);
    });

    it('rejects caller-controlled Service activation status', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;

      const res = await app.request('/admin/directions-services/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nomComplet: 'Service Autonomie',
          label: 'SA',
          email: '',
          emailContactUsager: '',
          adresseContactUsager: '',
          telContactUsager: '',
          isActive: false,
        }),
      });

      expect(res.status).toBe(400);
      expect(createServiceAdminLocal).not.toHaveBeenCalled();
    });

    it('passes a selected parent Direction for an Entité-administrative assignment', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      assignedEntiteIdState.value = 'root-ars';
      const visiblePayload = {
        nomComplet: 'Service Enfance',
        label: 'SE',
        email: '',
        emailContactUsager: '',
        adresseContactUsager: '',
        telContactUsager: '',
        directionId: 'dir-enfance',
      };
      vi.mocked(createServiceAdminLocal).mockResolvedValueOnce({
        id: 'service-enfance',
        nomComplet: 'Service Enfance',
        label: 'SE',
        email: '',
        isActive: true,
        emailContactUsager: '',
        adresseContactUsager: '',
        telContactUsager: '',
      });

      const res = await app.request('/admin/directions-services/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(visiblePayload),
      });

      expect(res.status).toBe(200);
      expect(createServiceAdminLocal).toHaveBeenCalledWith(
        'root-ars',
        {
          nomComplet: 'Service Enfance',
          label: 'SE',
          email: '',
          emailContactUsager: '',
          adresseContactUsager: '',
          telContactUsager: '',
        },
        'dir-enfance',
      );
    });

    it('returns 404 when the assigned parent entity no longer exists', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      vi.mocked(createServiceAdminLocal).mockRejectedValueOnce(new EntiteNotFoundError());

      const res = await app.request('/admin/directions-services/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nomComplet: 'Service Autonomie',
          label: 'SA',
          email: '',
          emailContactUsager: '',
          adresseContactUsager: '',
          telContactUsager: '',
        }),
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        message: 'Entite not found',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
    });

    it('returns 400 when the assigned entity cannot parent a Service', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;
      vi.mocked(createServiceAdminLocal).mockRejectedValueOnce(new EntiteChildCreationForbiddenError());

      const res = await app.request('/admin/directions-services/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nomComplet: 'Service refusé',
          label: 'SR',
          email: '',
          emailContactUsager: '',
          adresseContactUsager: '',
          telContactUsager: '',
        }),
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: 'Child entite creation is not allowed for this parent',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
    });
  });

  describe('GET /admin/roots', () => {
    it('returns root entites options for SUPER_ADMIN', async () => {
      vi.mocked(getRootEntitesListAdmin).mockResolvedValueOnce([
        { id: 'root-ars', nomComplet: 'ARS Normandie', label: 'ARS NOR' },
      ]);

      const res = await app.request('/admin/roots');

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [{ id: 'root-ars', nomComplet: 'ARS Normandie', label: 'ARS NOR' }],
      });
      expect(getRootEntitesListAdmin).toHaveBeenCalledWith();
    });

    it('rejects non SUPER_ADMIN users with 403', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;

      const res = await app.request('/admin/roots');

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ message: 'Forbidden' });
      expect(getRootEntitesListAdmin).not.toHaveBeenCalled();
    });
  });

  describe('GET /admin/:id', () => {
    it('returns the limited admin entity payload for SUPER_ADMIN', async () => {
      vi.mocked(getEntiteById).mockResolvedValueOnce({
        id: '2',
        nomComplet: 'Entite B',
        label: 'b',
        email: 'test2@domain.fr',
        emailContactUsager: '',
        telContactUsager: '',
        adresseContactUsager: '',
        isActive: false,
      });

      const res = await app.request('/admin/2');

      expect(getEntiteById).toHaveBeenCalledWith('2');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          id: '2',
          nomComplet: 'Entite B',
          label: 'b',
          email: 'test2@domain.fr',
          emailContactUsager: '',
          telContactUsager: '',
          adresseContactUsager: '',
          isActive: false,
        },
      });
    });

    it('rejects non SUPER_ADMIN users with 403', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;

      const res = await app.request('/admin/2');

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ message: 'Forbidden' });
      expect(getEntiteById).not.toHaveBeenCalled();
    });

    it('returns 404 when the admin entity is not found', async () => {
      vi.mocked(getEntiteById).mockResolvedValueOnce(null);

      const res = await app.request('/admin/unknown');

      expect(getEntiteById).toHaveBeenCalledWith('unknown');
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ message: 'Entite not found', cause: { kind: ERROR_KIND.BUSINESS } });
    });
  });

  describe('PATCH /admin/:id', () => {
    const editEntitePayload = {
      nomComplet: 'Entite B modifiée',
      label: 'ENT B',
      email: 'notification@example.fr',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République\n75000 Paris',
      telContactUsager: '0102030405',
      isActive: true,
    };

    it('updates the admin entity contact fields for SUPER_ADMIN', async () => {
      editEntiteAdminSpy.mockResolvedValueOnce({
        id: '2',
        ...editEntitePayload,
      });

      const res = await app.request('/admin/2', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(editEntitePayload),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          id: '2',
          ...editEntitePayload,
        },
      });
      expect(editEntiteAdminSpy).toHaveBeenCalledWith('2', editEntitePayload);
    });

    it('rejects non SUPER_ADMIN users with 403', async () => {
      currentRole.value = ROLES.ENTITY_ADMIN;

      const res = await app.request('/admin/2', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(editEntitePayload),
      });

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ message: 'Forbidden' });
      expect(editEntiteAdminSpy).not.toHaveBeenCalled();
    });

    it('returns 404 when the admin entity to update is not found', async () => {
      editEntiteAdminSpy.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record to update not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
          meta: {
            modelName: 'Entite',
          },
        }),
      );

      const res = await app.request('/admin/unknown', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(editEntitePayload),
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ message: 'Entite not found', cause: { kind: ERROR_KIND.BUSINESS } });
      expect(editEntiteAdminSpy).toHaveBeenCalledWith('unknown', editEntitePayload);
    });
  });

  describe('POST /admin/:id/children', () => {
    const createChildEntitePayload = {
      nomComplet: 'Direction de la prévention',
      label: 'DIR PREV',
      email: 'direction@example.fr',
      emailContactUsager: 'contact@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: true,
    };

    it('creates a child entity from a root parent for SUPER_ADMIN', async () => {
      createChildEntiteAdminSpy.mockResolvedValueOnce({
        id: 'direction-1',
        ...createChildEntitePayload,
      });

      const res = await app.request('/admin/root-ars/children', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(createChildEntitePayload),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          id: 'direction-1',
          ...createChildEntitePayload,
        },
      });
      expect(createChildEntiteAdminSpy).toHaveBeenCalledWith('root-ars', createChildEntitePayload);
    });

    it('returns 404 when the parent entity is not found', async () => {
      createChildEntiteAdminSpy.mockRejectedValueOnce(new EntiteNotFoundError());

      const res = await app.request('/admin/unknown/children', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(createChildEntitePayload),
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ message: 'Entite not found', cause: { kind: ERROR_KIND.BUSINESS } });
      expect(createChildEntiteAdminSpy).toHaveBeenCalledWith('unknown', createChildEntitePayload);
    });

    it('returns 400 when the parent entity cannot create children', async () => {
      createChildEntiteAdminSpy.mockRejectedValueOnce(new EntiteChildCreationForbiddenError());

      const res = await app.request('/admin/service-1/children', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(createChildEntitePayload),
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: 'Child entite creation is not allowed for this parent',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(createChildEntiteAdminSpy).toHaveBeenCalledWith('service-1', createChildEntitePayload);
    });
  });

  describe('GET /:id?', () => {
    it('should return entities from root when id is not provided', async () => {
      vi.mocked(getEntites).mockResolvedValueOnce({
        data: [mockEntite],
        total: 1,
      });

      const res = await client[':id?'].$get({
        param: { id: undefined },
        query: { offset: '0', limit: '10' },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [mockEntite],
        meta: {
          offset: 0,
          limit: 10,
          total: 1,
        },
      });

      expect(getEntites).toHaveBeenCalledWith(null, {
        offset: 0,
        limit: 10,
      });
    });

    it('should return entities for given parent id', async () => {
      vi.mocked(getEntites).mockResolvedValueOnce({
        data: [mockEntite],
        total: 1,
      });

      const res = await client[':id?'].$get({
        param: { id: '1' },
        query: { offset: '0', limit: '5' },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [mockEntite],
        meta: {
          offset: 0,
          limit: 5,
          total: 1,
        },
      });

      expect(getEntites).toHaveBeenCalledWith('1', {
        offset: 0,
        limit: 5,
      });
    });
  });

  describe('GET /chain/:id?', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return the entity chain for given ID', async () => {
      const mockData = [
        {
          id: '1',
          nomComplet: 'Root',
          disabled: true,
          entiteMereId: null,
          label: 'Root',
          entiteTypeId: 'ENTITE_TYPE_A',
        },
        {
          id: '2',
          nomComplet: 'Child',
          disabled: false,
          entiteMereId: '1',
          label: 'Child',
          entiteTypeId: 'ENTITE_TYPE_A',
        },
      ];

      vi.mocked(getEditableEntitiesChain).mockResolvedValueOnce(mockData);

      const res = await client.chain[':id?'].$get({ param: { id: '1' } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: mockData });
      expect(getEditableEntitiesChain).toHaveBeenCalledWith('1', ['dir-autonomie', 'service-pa']);
    });

    it('should return empty array if no ID is provided', async () => {
      const res = await client.chain[':id?'].$get({ param: { id: undefined } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [] });
      expect(getEditableEntitiesChain).not.toHaveBeenCalled();
    });
  });
});
