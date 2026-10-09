import { deleteCookie, getCookie } from 'hono/cookie';
import { testClient } from 'hono/testing';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envVars } from '../config/env.js';
import { authUser } from '../features/auth/auth.helper.js';
import { createSession, deleteSession, getSession, getSessionIdById } from '../features/sessions/sessions.service.js';
import { getUserById } from '../features/users/users.service.js';
import { errorHandler } from '../helpers/errors.js';
import appWithAuth from '../helpers/factories/appWithAuth.js';
import appWithLogs from '../helpers/factories/appWithLogs.js';
import { getJwtExpirationDate, signAuthCookie, signRefreshCookie } from '../helpers/jsonwebtoken.js';
import type { Session } from '../libs/prisma.js';
import authMiddleware from './auth.middleware.js';
import pinoLogger from './pino.middleware.js';

vi.mock('../../config/env.js', () => ({
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

vi.mock('../features/sessions/sessions.service.js', () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  getSessionIdById: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock('../features/users/users.service.js', () => ({
  getUserById: vi.fn(),
}));

const SESSION_ID = 'session-1';

const createClient = () => {
  const route = appWithAuth
    .createApp()
    .use(authMiddleware)
    .get('/', async (c) => c.json({ ok: true }));

  const app = appWithLogs.createApp().use(pinoLogger()).route('/test', route).onError(errorHandler);

  return testClient(app);
};

const createSessionFixture = (token: string): Session => ({
  id: SESSION_ID,
  token,
  userId: '1',
  pcIdToken: 'pc-id-token',
  expiresAt: getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION),
  createdAt: new Date(),
});

const extractAuthToken = (res: Response) => {
  const setCookieHeader = res.headers.get('Set-Cookie') ?? '';
  return new RegExp(`${envVars.AUTH_TOKEN_NAME}=([^;]+)`).exec(setCookieHeader)?.[1];
};

describe('auth.middleware.ts Auth Helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should handle auth token verification and refresh token logic', async () => {
    const client = createClient();

    const userId = '1';
    const roleId = '1';
    const authTokenExpirationDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);
    const refreshTokenExpirationDate = getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION);

    const refreshToken = signRefreshCookie(userId, refreshTokenExpirationDate);
    const authToken = signAuthCookie({ id: userId, roleId, sessionId: SESSION_ID }, authTokenExpirationDate);

    const fakeUser = { id: userId, roleId, email: 'test@test.com' };
    vi.mocked(getSessionIdById).mockResolvedValueOnce(createSessionFixture(refreshToken));
    vi.mocked(getUserById).mockResolvedValueOnce(fakeUser as Awaited<ReturnType<typeof getUserById>>);

    const res = await client.test.$get(undefined, {
      headers: {
        Cookie: `${envVars.REFRESH_TOKEN_NAME}=${refreshToken}; ${envVars.AUTH_TOKEN_NAME}=${authToken}`,
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(getSessionIdById).toHaveBeenCalledTimes(1);
    expect(getSessionIdById).toHaveBeenCalledWith(SESSION_ID);
  });

  it('should fetch fresh roleId from database even with valid auth token', async () => {
    const route = appWithAuth
      .createApp()
      .use(authMiddleware)
      .get('/', async (c) => c.json({ roleId: c.get('roleId') }));

    const app = appWithLogs.createApp().use(pinoLogger()).route('/test', route).onError(errorHandler);

    const client = testClient(app);

    const userId = '1';
    const tokenRoleId = 'OLD_ROLE';
    const dbRoleId = 'NEW_ROLE';
    const authTokenExpirationDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);
    const refreshTokenExpirationDate = getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION);

    const refreshToken = signRefreshCookie(userId, refreshTokenExpirationDate);
    const authToken = signAuthCookie(
      { id: userId, roleId: tokenRoleId, sessionId: SESSION_ID },
      authTokenExpirationDate,
    );

    const fakeUser = { id: userId, roleId: dbRoleId, email: 'test@test.com' };
    vi.mocked(getSessionIdById).mockResolvedValueOnce(createSessionFixture(refreshToken));
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
    const client = createClient();

    const res = await client.test.$get();
    expect(res.status).toBe(401);
    const body = await res.json();

    if ('message' in body) {
      expect(body.message).toBe('Unauthorized, Refresh token is invalid or expired');
    } else {
      throw new Error('Expected error message in response');
    }
  });

  it('should reject a valid auth token whose session has been deleted', async () => {
    const client = createClient();

    const userId = '1';
    const roleId = '1';
    const refreshToken = signRefreshCookie(userId, getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION));
    const authToken = signAuthCookie(
      { id: userId, roleId, sessionId: SESSION_ID },
      getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION),
    );

    vi.mocked(getSessionIdById).mockResolvedValueOnce(null);
    vi.mocked(getSession).mockResolvedValueOnce(null);

    const res = await client.test.$get(undefined, {
      headers: {
        Cookie: `${envVars.REFRESH_TOKEN_NAME}=${refreshToken}; ${envVars.AUTH_TOKEN_NAME}=${authToken}`,
      },
    });

    expect(res.status).toBe(401);
    expect(getSessionIdById).toHaveBeenCalledWith(SESSION_ID);
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('should fall back to the refresh token when the auth token carries no session id', async () => {
    const client = createClient();

    const userId = '1';
    const roleId = '1';
    const refreshToken = signRefreshCookie(userId, getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION));
    const legacyAuthToken = jwt.sign({ id: userId, roleId }, envVars.AUTH_TOKEN_SECRET_KEY, {
      expiresIn: Number.parseInt(envVars.AUTH_TOKEN_EXPIRATION, 10),
    });

    const fakeUser = { id: userId, roleId, email: 'test@test.com' };
    vi.mocked(getSession).mockResolvedValueOnce(createSessionFixture(refreshToken));
    vi.mocked(getUserById).mockResolvedValueOnce(fakeUser as Awaited<ReturnType<typeof getUserById>>);

    const res = await client.test.$get(undefined, {
      headers: {
        Cookie: `${envVars.REFRESH_TOKEN_NAME}=${refreshToken}; ${envVars.AUTH_TOKEN_NAME}=${legacyAuthToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(getSessionIdById).not.toHaveBeenCalled();
    expect(getSession).toHaveBeenCalledWith(refreshToken);

    const renewedAuthToken = extractAuthToken(res);
    expect(renewedAuthToken).toBeDefined();
    expect(jwt.verify(renewedAuthToken as string, envVars.AUTH_TOKEN_SECRET_KEY)).toMatchObject({
      id: userId,
      roleId,
      sessionId: SESSION_ID,
    });
  });

  it('should reject a replayed auth token once the session is deleted at logout', async () => {
    const client = createClient();

    const userId = '1';
    const roleId = '1';
    const refreshToken = signRefreshCookie(userId, getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION));
    const authToken = signAuthCookie(
      { id: userId, roleId, sessionId: SESSION_ID },
      getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION),
    );

    const sessionStore = new Map<string, Session>([[SESSION_ID, createSessionFixture(refreshToken)]]);
    const findByToken = (token: string) => [...sessionStore.values()].find((session) => session.token === token);

    vi.mocked(getSessionIdById).mockImplementation(async (id) => sessionStore.get(id) ?? null);
    vi.mocked(getSession).mockImplementation(async (token) => findByToken(token) ?? null);
    vi.mocked(deleteSession).mockImplementation(async (token) => {
      const session = findByToken(token);
      if (!session) {
        throw new Error('Session not found');
      }
      sessionStore.delete(session.id);
      return session;
    });

    const fakeUser = { id: userId, roleId, email: 'test@test.com' };
    vi.mocked(getUserById).mockResolvedValue(fakeUser as Awaited<ReturnType<typeof getUserById>>);

    const cookieHeader = `${envVars.REFRESH_TOKEN_NAME}=${refreshToken}; ${envVars.AUTH_TOKEN_NAME}=${authToken}`;

    const beforeLogout = await client.test.$get(undefined, { headers: { Cookie: cookieHeader } });
    expect(beforeLogout.status).toBe(200);

    await deleteSession(refreshToken);

    const afterLogout = await client.test.$get(undefined, { headers: { Cookie: cookieHeader } });
    expect(afterLogout.status).toBe(401);
  });
});

describe('auth.middleware.ts session lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const buildCookieHeader = (res: Response) =>
    res.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');

  it('should cover login, authenticated request, refresh, logout and replay', async () => {
    const userId = '1';
    const roleId = 'ENTITY_ADMIN';

    const sessionStore = new Map<string, Session>();
    const findByToken = (token: string) => [...sessionStore.values()].find((session) => session.token === token);

    vi.mocked(createSession).mockImplementation(async (dto) => {
      const session: Session = {
        id: SESSION_ID,
        token: dto.token,
        userId: dto.userId,
        pcIdToken: dto.pcIdToken,
        expiresAt: dto.expiresAt,
        createdAt: new Date(),
      };
      sessionStore.set(session.id, session);
      return session;
    });
    vi.mocked(getSessionIdById).mockImplementation(async (id) => sessionStore.get(id) ?? null);
    vi.mocked(getSession).mockImplementation(async (token) => findByToken(token) ?? null);
    vi.mocked(deleteSession).mockImplementation(async (token) => {
      const session = findByToken(token);
      if (!session) {
        throw new Error('Session not found');
      }
      sessionStore.delete(session.id);
      return session;
    });

    const fakeUser = { id: userId, roleId, email: 'test@test.com' };
    vi.mocked(getUserById).mockResolvedValue(fakeUser as Awaited<ReturnType<typeof getUserById>>);

    const publicRoutes = appWithLogs
      .createApp()
      .post('/login', async (c) => {
        const errorResponse = await authUser(c, { id: userId, roleId }, 'pc-id-token');
        if (errorResponse) {
          return errorResponse;
        }
        return c.json({ ok: true });
      })
      .post('/logout', async (c) => {
        const token = getCookie(c, envVars.REFRESH_TOKEN_NAME);
        deleteCookie(c, envVars.AUTH_TOKEN_NAME);
        deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
        if (token) {
          await deleteSession(token);
        }
        return c.json({ ok: true });
      });

    const protectedRoutes = appWithAuth
      .createApp()
      .use(authMiddleware)
      .get('/', async (c) => c.json({ ok: true }));

    const app = appWithLogs
      .createApp()
      .use(pinoLogger())
      .route('/auth', publicRoutes)
      .route('/test', protectedRoutes)
      .onError(errorHandler);

    const client = testClient(app);

    const login = await client.auth.login.$post();
    expect(login.status).toBe(200);
    expect(sessionStore.size).toBe(1);

    const cookieHeader = buildCookieHeader(login);
    expect(cookieHeader).toContain(`${envVars.AUTH_TOKEN_NAME}=`);
    expect(cookieHeader).toContain(`${envVars.REFRESH_TOKEN_NAME}=`);

    const authenticated = await client.test.$get(undefined, { headers: { Cookie: cookieHeader } });
    expect(authenticated.status).toBe(200);
    expect(getSessionIdById).toHaveBeenCalledWith(SESSION_ID);

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + (Number.parseInt(envVars.AUTH_TOKEN_EXPIRATION, 10) + 60) * 1000);

    const refreshed = await client.test.$get(undefined, { headers: { Cookie: cookieHeader } });
    expect(refreshed.status).toBe(200);
    const renewedAuthToken = extractAuthToken(refreshed);
    expect(renewedAuthToken).toBeDefined();
    expect(jwt.verify(renewedAuthToken as string, envVars.AUTH_TOKEN_SECRET_KEY)).toMatchObject({
      id: userId,
      sessionId: SESSION_ID,
    });

    vi.useRealTimers();

    const logout = await client.auth.logout.$post(undefined, { headers: { Cookie: cookieHeader } });
    expect(logout.status).toBe(200);
    expect(sessionStore.size).toBe(0);

    const replayed = await client.test.$get(undefined, { headers: { Cookie: cookieHeader } });
    expect(replayed.status).toBe(401);
  });
});
