import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { envVars } from '@/config/env';
import { getUserById } from '@/features/users/users.service';
import { errorHandler } from '@/helpers/errors';
import appWithAuth from '@/helpers/factories/appWithAuth';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { getJwtExpirationDate, signAuthCookie, signRefreshCookie } from '@/helpers/jsonwebtoken';
import authMiddleware from '@/middlewares/auth.middleware';

vi.mock('@/config/env', () => ({
  envVars: {
    AUTH_TOKEN_NAME: 'authToken',
    AUTH_TOKEN_EXPIRATION: '600',
    AUTH_TOKEN_SECRET_KEY: 'secret-auth-token',
    REFRESH_TOKEN_NAME: 'refreshToken',
    REFRESH_TOKEN_SECRET_KEY: 'secret-refresh-token',
    REFRESH_TOKEN_EXPIRATION: '86400',
    IS_LOGGED_TOKEN_NAME: 'isLoggedIn',
  },
}));

vi.mock('@/features/sessions/sessions.service', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/features/users/users.service', () => ({
  getUserById: vi.fn(),
}));

describe('auth.middleware.ts Auth Helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should handle auth token verification and refresh token logic', async () => {
    const route = appWithAuth
      .createApp()
      .use(authMiddleware)
      .get('/', async (c) => c.json({ ok: true }));

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);

    const client = testClient(app);

    const userId = '1';
    const roleId = '1';
    const authTokenExpirationDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);
    const refreshTokenExpirationDate = getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION);

    const refreshToken = signRefreshCookie(userId, refreshTokenExpirationDate);
    const authToken = signAuthCookie({ id: userId, roleId }, authTokenExpirationDate);

    const fakeUser = { id: userId, roleId, email: 'test@test.com' };
    vi.mocked(getUserById).mockResolvedValueOnce(fakeUser as Awaited<ReturnType<typeof getUserById>>);

    const res = await client.test.$get(undefined, {
      headers: {
        Cookie: `${envVars.REFRESH_TOKEN_NAME}=${refreshToken}; ${envVars.AUTH_TOKEN_NAME}=${authToken}`,
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('should fetch fresh roleId from database even with valid auth token', async () => {
    const route = appWithAuth
      .createApp()
      .use(authMiddleware)
      .get('/', async (c) => c.json({ roleId: c.get('roleId') }));

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);

    const client = testClient(app);

    const userId = '1';
    const tokenRoleId = 'OLD_ROLE';
    const dbRoleId = 'NEW_ROLE';
    const authTokenExpirationDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);
    const refreshTokenExpirationDate = getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION);

    const refreshToken = signRefreshCookie(userId, refreshTokenExpirationDate);
    const authToken = signAuthCookie({ id: userId, roleId: tokenRoleId }, authTokenExpirationDate);

    const fakeUser = { id: userId, roleId: dbRoleId, email: 'test@test.com' };
    vi.mocked(getUserById).mockResolvedValueOnce(fakeUser as Awaited<ReturnType<typeof getUserById>>);

    const res = await client.test.$get(undefined, {
      headers: {
        Cookie: `${envVars.REFRESH_TOKEN_NAME}=${refreshToken}; ${envVars.AUTH_TOKEN_NAME}=${authToken}`,
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ roleId: dbRoleId });
  });

  it('should handle auth token verification failure (no tokens)', async () => {
    const route = appWithAuth
      .createApp()
      .use(authMiddleware)
      .get('/', async (c) => c.json({ ok: true }));

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);

    const client = testClient(app);

    const res = await client.test.$get();
    expect(res.status).toBe(401);
    const body = await res.json();

    if ('message' in body) {
      expect(body.message).toBe('Unauthorized, Refresh token is invalid or expired');
    } else {
      throw new Error('Expected error message in response');
    }
  });
});
