import { ROLES } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { Prisma } from '../../libs/prisma.js';
import pinoLogger from '../../middlewares/pino.middleware.js';
import EntitesController from './entites.controller.js';
import { EntiteChildCreationForbiddenError, EntiteNotFoundError } from './entites.error.js';
import { getEditableEntitiesChain, getEntiteById, getEntites, getEntitesListAdmin } from './entites.service.js';

vi.mock('../../config/env.js', () => ({
  envVars: {},
}));

vi.mock('./entites.service.js', () => ({
  getEntites: vi.fn(),
  getEntiteById: vi.fn(),
  getEntitesListAdmin: vi.fn(),
  getEditableEntitiesChain: vi.fn(),
  editEntiteAdmin: editEntiteAdminSpy,
  createChildEntiteAdmin: createChildEntiteAdminSpy,
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
  patchEntiteAdminByIdSpy: editEntiteAdminSpy,
  postChildEntiteAdminSpy: createChildEntiteAdminSpy,
} = vi.hoisted(() => ({
  roleMiddlewareSpy: vi.fn(),
  currentRole: { value: 'SUPER_ADMIN' },
  patchEntiteAdminByIdSpy: vi.fn(),
  postChildEntiteAdminSpy: vi.fn(),
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
      c.set('entiteIds', ['id1', 'id2']);
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
    vi.clearAllMocks();
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

  describe('GET /admin/:id', () => {
    it('returns the limited admin entity payload for SUPER_ADMIN', async () => {
      vi.mocked(getEntiteById).mockResolvedValueOnce({
        id: '2',
        nomComplet: 'Entite B',
        label: 'b',
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
      expect(await res.json()).toEqual({ message: 'Entite not found' });
    });
  });

  describe('PATCH /admin/:id', () => {
    const editEntitePayload = {
      nomComplet: 'Entite B modifiée',
      label: 'ENT B',
      isActive: true,
    };

    it('updates the limited admin entity payload for SUPER_ADMIN', async () => {
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
      expect(await res.json()).toEqual({ message: 'Entite not found' });
      expect(editEntiteAdminSpy).toHaveBeenCalledWith('unknown', editEntitePayload);
    });
  });

  describe('POST /admin/:id/children', () => {
    const createChildEntitePayload = {
      nomComplet: 'Direction de la prévention',
      label: 'DIR PREV',
      email: 'direction@example.fr',
      emailDomain: '@example.fr',
      organizationalUnit: 'DIR-PREV',
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
      expect(await res.json()).toEqual({ message: 'Entite not found' });
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
      expect(await res.json()).toEqual({ message: 'Child entite creation is not allowed for this parent' });
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
      expect(getEditableEntitiesChain).toHaveBeenCalledWith('1', ['id1', 'id2']);
    });

    it('should return empty array if no ID is provided', async () => {
      const res = await client.chain[':id?'].$get({ param: { id: undefined } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [] });
      expect(getEditableEntitiesChain).not.toHaveBeenCalled();
    });
  });
});
