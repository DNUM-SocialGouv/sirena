import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
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

describe('Users endpoints: /users', () => {
  const client = testClient(UsersController);

  const fakeData = [
    {
      id: 'id1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      sub: 'sub1',
      uid: 'uid1',
      createdAt: new Date(0),
      roleId: 'role1',
      active: true,
      pcData: {},
      statutId: '1',
      entiteId: null,
      role: { id: 'role1', label: 'Admin' },
    },
    {
      id: 'id2',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      sub: 'sub2',
      uid: 'uid2',
      createdAt: new Date(0),
      roleId: 'role2',
      active: false,
      pcData: {},
      statutId: '1',
      entiteId: null,
      role: { id: 'role1', label: 'Admin' },
    },
  ];

  describe('GET /', () => {
    it('should return a list of users with filters', async () => {
      vi.mocked(getUsers).mockResolvedValueOnce({ data: fakeData, total: 2 });

      const res = await client.index.$get({ query: { roleId: 'role1', active: 'true' } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(fakeData), meta: { total: 2 } });
      expect(getUsers).toHaveBeenCalledWith(['e1', 'e2', 'e3'], { roleId: ['role1'], active: true });
    });

    it('should return meta with offset and limit when provided in query', async () => {
      vi.mocked(getUsers).mockResolvedValueOnce({ data: fakeData, total: 2 });

      const res = await client.index.$get({
        query: {
          roleId: 'role1',
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
        roleId: ['role1'],
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
      expect(getUserById).toHaveBeenCalledWith(fakeData[0].id, ['e1', 'e2', 'e3']);
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
      vi.mocked(patchUser).mockResolvedValueOnce({ ...fakeData[0], roleId: 'ENTITY_ADMIN', entiteId: 'e2' });

      const res = await client[':id'].$patch({
        param: { id: 'user-id-1' },
        json: { roleId: 'ENTITY_ADMIN', entiteId: 'e2' },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: convertDatesToStrings({ ...fakeData[0], roleId: 'ENTITY_ADMIN', entiteId: 'e2' }),
      });
    });

    it('should return 400 if role is not assignable', async () => {
      const res = await client[':id'].$patch({
        param: { id: 'user-id-1' },
        json: { roleId: 'SUPER_ADMIN' },
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ message: 'Role not assignable' });
    });

    it('should return 400 if entité is not assignable', async () => {
      const res = await client[':id'].$patch({
        param: { id: 'user-id-1' },
        json: { entiteId: 'e99' },
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ message: 'Entité not assignable' });
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(patchUser).mockResolvedValueOnce(null);

      const res = await client[':id'].$patch({
        param: { id: 'unknown' },
        json: { roleId: 'ENTITY_ADMIN' },
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ message: 'User not found' });
    });

    it('should prevent user from changing their own role', async () => {
      vi.resetAllMocks();
      vi.mocked(patchUser).mockResolvedValueOnce({ ...fakeData[0] });

      const res = await client[':id'].$patch({
        param: { id: 'id10' },
        json: { roleId: 'SUPER_ADMIN' },
      });

      expect(res.status).toBe(200);
      expect(patchUser).toHaveBeenCalledWith('id10', {}, ['e1', 'e2', 'e3']);
    });
  });
});
