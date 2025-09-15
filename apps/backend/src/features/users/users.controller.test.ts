import { ROLES } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import pinoLogger from '@/middlewares/pino.middleware';
import { convertDatesToStrings } from '@/tests/formatter';
import UsersController from './users.controller';
import { getUserById, getUsers, patchUser } from './users.service';

vi.mock('./users.service', () => ({
  getUsers: vi.fn(),
  getUserById: vi.fn(),
  patchUser: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  envVars: {},
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('userId', 'id10');
      return next();
    },
  };
});

vi.mock('@/middlewares/userStatus.middleware', () => {
  return {
    default: (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('@/middlewares/role.middleware', () => {
  return {
    default: () => {
      return (c: Context, next: Next) => {
        c.set('roleId', 'ENTITY_ADMIN');
        return next();
      };
    },
  };
});

vi.mock('@/middlewares/entites.middleware', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('entiteIds', ['e1', 'e2', 'e3']);
      return next();
    },
  };
});

vi.mock('@/middlewares/changelog/changelog.user.middleware', () => {
  return {
    default: () => (_: Context, next: Next) => {
      return next();
    },
  };
});

describe('Users endpoints: /users', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', UsersController).onError(errorHandler);
  const client = testClient(app);

  const fakeData = [
    {
      id: 'id1',
      email: 'user1@example.com',
      prenom: 'John',
      nom: 'Doe',
      sub: 'sub1',
      uid: 'uid1',
      createdAt: new Date(0),
      roleId: 'role1',
      active: true,
      pcData: {},
      statutId: '1',
      entiteId: null,
      role: { id: ROLES.NATIONAL_STEERING, label: 'Admin' },
    },
    {
      id: 'id2',
      email: 'user2@example.com',
      prenom: 'Jane',
      nom: 'Smith',
      sub: 'sub2',
      uid: 'uid2',
      createdAt: new Date(0),
      roleId: 'role2',
      active: false,
      pcData: {},
      statutId: '1',
      entiteId: null,
      role: { id: ROLES.READER, label: 'Admin' },
    },
  ];

  describe('GET /', () => {
    it('should return a list of users with filters', async () => {
      vi.mocked(getUsers).mockResolvedValueOnce({ data: fakeData, total: 2 });

      const res = await client.index.$get({
        query: { roleId: ROLES.NATIONAL_STEERING, active: 'true' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings(fakeData),
        meta: { total: 2 },
      });
      expect(getUsers).toHaveBeenCalledWith(['e1', 'e2', 'e3'], {
        roleId: [ROLES.NATIONAL_STEERING],
        active: true,
      });
    });

    it('should return an error, "You are not allowed to filter on this role."', async () => {
      const res = await client.index.$get({
        query: { roleId: ROLES.SUPER_ADMIN, active: 'true' },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({
        message: 'You are not allowed to filter on this role.',
      });
    });

    it('should return meta with offset and limit when provided in query', async () => {
      vi.mocked(getUsers).mockResolvedValueOnce({ data: fakeData, total: 2 });

      const res = await client.index.$get({
        query: {
          roleId: `${ROLES.ENTITY_ADMIN},${ROLES.PENDING}`,
          active: 'true',
          offset: '10',
          limit: '5',
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings(fakeData),
        meta: { offset: 10, limit: 5, total: 2 },
      });

      expect(getUsers).toHaveBeenCalledWith(['e1', 'e2', 'e3'], {
        roleId: [ROLES.ENTITY_ADMIN, ROLES.PENDING],
        active: true,
        offset: 10,
        limit: 5,
      });
    });
  });

  describe('GET /:id', () => {
    it('should return 200 and the user if found', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(fakeData[0]);

      const res = await client[':id'].$get({ param: { id: fakeData[0].id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(fakeData[0]) });
      expect(getUserById).toHaveBeenCalledWith(
        fakeData[0].id,
        ['e1', 'e2', 'e3'],
        [ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER, ROLES.READER, ROLES.PENDING],
      );
    });

    it('should return 404 if user is not found', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(null);

      const res = await client[':id'].$get({ param: { id: 'nonexistent-id' } });
      expect(res.status).toBe(404);
      const body = await res.json();
      if ('message' in body) {
        expect(body.message).toBe('User not found');
      } else {
        throw new Error('Expected error message in response');
      }
    });
  });

  describe('PATCH /:id', () => {
    it('should update a user by ID', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(fakeData[0]);
      vi.mocked(patchUser).mockResolvedValueOnce({
        ...fakeData[0],
        roleId: ROLES.ENTITY_ADMIN,
        entiteId: 'e2',
      });

      const res = await client[':id'].$patch({
        param: { id: 'user-id-1' },
        json: { roleId: ROLES.ENTITY_ADMIN, entiteId: 'e2' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings({
          ...fakeData[0],
          roleId: ROLES.ENTITY_ADMIN,
          entiteId: 'e2',
        }),
      });
    });

    it('should return 400 if role is not assignable', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce({
        ...fakeData[0],
        roleId: ROLES.SUPER_ADMIN,
      });
      const res = await client[':id'].$patch({
        param: { id: 'user-id-1' },
        json: { roleId: 'SUPER_ADMIN' },
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ message: 'No permissions' });
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(null);

      const res = await client[':id'].$patch({
        param: { id: 'unknown' },
        json: { roleId: 'ENTITY_ADMIN' },
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ message: 'User not found' });
    });

    it('should silently ignore entiteId if unchanged', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(fakeData[0]);
      vi.mocked(patchUser).mockResolvedValueOnce({ ...fakeData[0] });

      const res = await client[':id'].$patch({
        param: { id: fakeData[0].id },
        json: { entiteId: fakeData[0].entiteId },
      });

      expect(res.status).toBe(200);
      expect(patchUser).toHaveBeenCalledWith(fakeData[0].id, {});
    });

    it('should prevent user from setting not permit entityId', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce({
        ...fakeData[0],
        entiteId: 'e3',
      });

      const res = await client[':id'].$patch({
        param: { id: 'user-id-1' },
        json: { entiteId: 'e5' },
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ message: 'No permissions' });
    });

    it('should prevent user from changing their own role', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(fakeData[0]);
      vi.mocked(patchUser).mockResolvedValueOnce({ ...fakeData[0] });

      const res = await client[':id'].$patch({
        param: { id: 'id10' },
        json: { roleId: 'SUPER_ADMIN' },
      });

      expect(res.status).toBe(200);
      expect(patchUser).toHaveBeenCalledWith('id10', {});
    });
  });
});
