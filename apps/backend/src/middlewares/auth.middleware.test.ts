import { envVars } from '@/config/env';
import { getSession } from '@/features/sessions/sessions.service';
import { errorHandler } from '@/helpers/errors';
import appWithAuth from '@/helpers/factories/appWithAuth';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { getJwtExpirationDate, signAuthCookie, signRefreshCookie } from '@/helpers/jsonwebtoken';
import authMiddleware from '@/middlewares/auth.middleware';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

    const fakeSession = {
      id: '1',
      userId,
      token: refreshToken,
      expiresAt: new Date(),
      pcIdToken: '1',
      createdAt: new Date(),
    };
    vi.mocked(getSession).mockResolvedValue(fakeSession);

    const res = await client.test.$get(undefined, {
      headers: {
        Cookie: `${envVars.REFRESH_TOKEN_NAME}=${refreshToken}; ${envVars.AUTH_TOKEN_NAME}=${authToken}`,
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
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
