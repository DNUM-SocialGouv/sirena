import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import pinoLogger from '@/middlewares/pino.middleware';
import UsersController from './users.controller';
import { getUserById, patchUser } from './users.service';

vi.mock('./users.service', () => ({
  patchUser: vi.fn(),
  getUserById: vi.fn(),
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
        c.set('roleId', 'SUPER_ADMIN');
        return next();
      };
    },
  };
});

vi.mock('@/middlewares/entites.middleware', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('entiteIds', null);
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

const fakeUser = {
  id: 'id1',
  email: 'admin@example.com',
  prenom: 'Super',
  nom: 'Admin',
  sub: 'sub1',
  uid: 'uid1',
  createdAt: new Date(0),
  updatedAt: new Date(0),
  roleId: 'SUPER_ADMIN',
  active: true,
  pcData: {},
  statutId: '1',
  entiteId: null,
  role: { id: 'SUPER_ADMIN', label: 'Super Admin' },
};

describe('Users endpoints as admin: /users', () => {
  describe('PATCH /:id as super admin', () => {
    const app = appWithLogs.createApp().use(pinoLogger()).route('/', UsersController).onError(errorHandler);
    const client = testClient(app);

    it('should allow patch if entiteIds is null', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(fakeUser);
      vi.mocked(patchUser).mockResolvedValueOnce({
        ...fakeUser,
        entiteId: 'whatever',
      });

      const res = await client[':id'].$patch({
        param: { id: 'id1' },
        json: { entiteId: 'whatever' },
      });

      expect(res.status).toBe(200);
      expect(patchUser).toHaveBeenCalledWith('id1', { entiteId: 'whatever' });
    });
  });
});
