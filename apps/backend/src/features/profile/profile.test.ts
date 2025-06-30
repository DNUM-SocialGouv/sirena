import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { getUserById } from '@/features/users/users.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import pinoLogger from '@/middlewares/pino.middleware';
import { convertDatesToStrings } from '@/tests/formatter';
import profileController from './profile.controller';

vi.mock('@/config/env', () => ({
  envVars: {},
}));

vi.mock('@/features/users/users.service', () => ({
  getUserById: vi.fn(),
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: async (c: Context, next: Next) => {
      c.set('userId', 'id1');
      return next();
    },
  };
});

describe('Endpoint Profile', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/profile', profileController).onError(errorHandler);

  const client = testClient(app);

  const fakeUser = {
    id: 'id1',
    email: 'user1@example.com',
    firstName: 'John',
    lastName: 'Doe',
    uid: 'uid1',
    sub: 'sub1',
    createdAt: new Date(0),
    roleId: 'role1',
    active: true,
    pcData: {},
    statutId: '1',
    entiteId: null,
    role: { id: 'role1', label: 'Admin' },
  };

  it('should return user profile if found', async () => {
    vi.mocked(getUserById).mockResolvedValue(fakeUser);

    const res = await client.profile.$get('/');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ data: convertDatesToStrings(fakeUser) });
    expect(getUserById).toHaveBeenCalledWith('id1');
  });

  it('should return 401 if user not found', async () => {
    vi.mocked(getUserById).mockResolvedValue(null);

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
