import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import pinoLogger from '../../middlewares/pino.middleware.js';
import { convertDatesToStrings } from '../../tests/formatter.js';
import { getUserById } from '../users/users.service.js';
import ProfileController from './profile.controller.js';

vi.mock('../../config/env.js', () => ({
  envVars: {},
}));

vi.mock('../users/users.service.js', () => ({
  getUserById: vi.fn(),
}));

vi.mock('../../middlewares/auth.middleware.js', () => {
  return {
    default: async (c: Context, next: Next) => {
      c.set('userId', 'id1');
      return next();
    },
  };
});

vi.mock('../../middlewares/entites.middleware.js', () => {
  return {
    default: async (c: Context, next: Next) => {
      c.set('topEntiteId', 'topEntiteId1');
      c.set('entiteIds', ['entite-1', 'entite-2']);
      return next();
    },
  };
});

describe('Profile endpoints: /profile', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/profile', ProfileController).onError(errorHandler);

  const client = testClient(app);

  const fakeUser = {
    id: 'id1',
    email: 'user1@example.com',
    prenom: 'John',
    nom: 'Doe',
    uid: 'uid1',
    sub: 'sub1',
    createdAt: new Date(0),
    updatedAt: new Date(0),
    roleId: 'role1',
    pcData: {},
    statutId: 'ACTIF',
    entiteId: null,
    role: { id: 'role1', label: 'Admin' },
  };

  describe('GET /', () => {
    it('should return user profile if found', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(fakeUser);

      const res = await client.profile.$get('/');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({
        data: convertDatesToStrings({
          ...fakeUser,
          topEntiteId: 'topEntiteId1',
          entiteIds: ['entite-1', 'entite-2'],
        }),
      });
      expect(getUserById).toHaveBeenCalledWith('id1', null, null);
    });

    it('should return 401 if user not found', async () => {
      vi.mocked(getUserById).mockResolvedValueOnce(null);

      const res = await client.profile.$get('/');
      const json = await res.json();

      expect(res.status).toBe(401);
      if ('message' in json) {
        expect(json.message).toBe('Unauthorized, User not found');
      } else {
        throw new Error('Response does not contain message property');
      }
    });
  });
});
