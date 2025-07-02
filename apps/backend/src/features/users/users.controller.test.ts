import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { convertDatesToStrings } from '@/tests/formatter';
import app from './users.controller';
import { getUserById, getUsers } from './users.service';

vi.mock('./users.service', () => ({
  getUsers: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  envVars: {},
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (_c: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('@/middlewares/role.middleware', () => {
  return {
    default: () => {
      return (_c: Context, next: Next) => {
        return next();
      };
    },
  };
});

describe('Users endpoints: /users', () => {
  const client = testClient(app);

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
    it('should return a list of users without filters', async () => {
      vi.mocked(getUsers).mockResolvedValue(fakeData);

      const res = await client.index.$get({ query: {} });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(fakeData) });
      expect(getUsers).toHaveBeenCalledWith({ roleId: undefined, active: undefined });
    });

    it('should filter users by roleId', async () => {
      const filteredData = [fakeData[0]];
      vi.mocked(getUsers).mockResolvedValue(filteredData);

      const res = await client.index.$get({ query: { roleId: 'role1' } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(filteredData) });
      expect(getUsers).toHaveBeenCalledWith({ roleId: ['role1'], active: undefined });
    });

    it('should filter users by active status (true)', async () => {
      const filteredData = [fakeData[0]];
      vi.mocked(getUsers).mockResolvedValue(filteredData);

      const res = await client.index.$get({ query: { active: 'true' } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(filteredData) });
      expect(getUsers).toHaveBeenCalledWith({ roleId: undefined, active: true });
    });

    it('should filter users by active status (false)', async () => {
      const filteredData = [fakeData[1]];
      vi.mocked(getUsers).mockResolvedValue(filteredData);

      const res = await client.index.$get({ query: { active: 'false' } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(filteredData) });
      expect(getUsers).toHaveBeenCalledWith({ roleId: undefined, active: false });
    });

    it('should filter users by both roleId and active status', async () => {
      const filteredData = [fakeData[0]];
      vi.mocked(getUsers).mockResolvedValue(filteredData);

      const res = await client.index.$get({
        query: {
          roleId: 'role1',
          active: 'true',
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(filteredData) });
      expect(getUsers).toHaveBeenCalledWith({ roleId: ['role1'], active: true });
    });

    it('should return empty array when no users match filters', async () => {
      vi.mocked(getUsers).mockResolvedValue([]);

      const res = await client.index.$get({
        query: {
          roleId: 'nonexistent-role',
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: [] });
      expect(getUsers).toHaveBeenCalledWith({ roleId: ['nonexistent-role'], active: undefined });
    });
  });

  describe('GET /:id', () => {
    it('should return 200 and the user if found', async () => {
      vi.mocked(getUserById).mockResolvedValue(fakeData[0]);

      const res = await client[':id'].$get({ param: { id: fakeData[0].id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(fakeData[0]) });
      expect(getUserById).toHaveBeenCalledWith(fakeData[0].id);
    });

    it('should return 404 if user is not found', async () => {
      vi.mocked(getUserById).mockResolvedValue(null);

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
});
