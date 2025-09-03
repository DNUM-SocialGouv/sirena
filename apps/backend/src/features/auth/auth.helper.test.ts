import { AUTH_ERROR_CODES } from '@sirena/common/constants';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { envVars } from '@//config/env';
import { createSession } from '@/features/sessions/sessions.service';
import type { AppBindings } from '@/helpers/factories/appWithLogs';
import { getJwtExpirationDate, signAuthCookie, signRefreshCookie } from '@/helpers/jsonwebtoken';
import * as prismaHelpers from '@/helpers/prisma';
import { Prisma } from '@/libs/prisma';
import * as authHelper from './auth.helper';

vi.mock('@/helpers/jsonwebtoken', () => ({
  getJwtExpirationDate: vi.fn(),
  signRefreshCookie: vi.fn(),
  signAuthCookie: vi.fn(),
}));

vi.mock('@/features/sessions/sessions.service', () => ({
  createSession: vi.fn(),
}));

vi.mock('@/helpers/prisma', () => ({
  isPrismaUniqueConstraintError: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  envVars: {
    PC_REDIRECT_URI: 'https://example.com/redirect',
    REFRESH_TOKEN_NAME: 'refreshToken',
    AUTH_TOKEN_NAME: 'authToken',
    IS_LOGGED_TOKEN_NAME: 'isLoggedIn',
    FRONTEND_REDIRECT_URI: 'https://frontend.example.com/redirect',
    FRONTEND_REDIRECT_LOGIN_URI: 'https://frontend.example.com/login',
    AUTH_TOKEN_EXPIRATION: '15m',
    REFRESH_TOKEN_EXPIRATION: '7d',
  },
}));

describe('auth.helper.ts Auth Helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('authUser: should sign cookies and call createSession with correct arguments', async () => {
    const userId = 'user-123';
    const idToken = 'the-PC-id-token';

    const now = Date.now();
    const TEN_DAYS = 1000 * 60 * 60 * 24 * 10; // 10 days in ms
    const TWENTY_DAYS = 1000 * 60 * 60 * 24 * 20; // 20 days in ms

    const fakeAuthExpiry = new Date(now + TEN_DAYS);
    const fakeRefreshExpiry = new Date(now + TWENTY_DAYS);

    vi.mocked(getJwtExpirationDate).mockImplementation((duration) =>
      duration === envVars.AUTH_TOKEN_EXPIRATION ? fakeAuthExpiry : fakeRefreshExpiry,
    );

    vi.mocked(signRefreshCookie).mockReturnValueOnce('SIGNED_REFRESH_TOKEN_VALUE');
    vi.mocked(signAuthCookie).mockReturnValueOnce('SIGNED_AUTH_TOKEN_VALUE');

    const app = new Hono<{ Bindings: AppBindings }>().get('/test', async (c: Context<AppBindings>) => {
      await authHelper.authUser(c, { id: userId, roleId: 'PENDING' }, idToken);
      return c.json({ ok: true });
    });

    const client = testClient(app);

    const res = await client.test.$get();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(getJwtExpirationDate).toHaveBeenCalledTimes(2);
    expect(getJwtExpirationDate).toHaveBeenCalledWith(envVars.AUTH_TOKEN_EXPIRATION);
    expect(getJwtExpirationDate).toHaveBeenCalledWith(envVars.REFRESH_TOKEN_EXPIRATION);

    expect(signAuthCookie).toHaveBeenCalledTimes(1);
    expect(signAuthCookie).toHaveBeenCalledWith({ id: userId, roleId: 'PENDING' }, fakeAuthExpiry);

    expect(signRefreshCookie).toHaveBeenCalledTimes(1);
    expect(signRefreshCookie).toHaveBeenCalledWith(userId, fakeRefreshExpiry);

    const setCookieHeaders = res.headers.get('Set-Cookie');
    expect(setCookieHeaders).toContain(`authToken=${'SIGNED_AUTH_TOKEN_VALUE'}`);
    expect(setCookieHeaders).toContain(`Expires=${fakeAuthExpiry.toUTCString()}`);

    expect(setCookieHeaders).toContain(`refreshToken=${'SIGNED_REFRESH_TOKEN_VALUE'}`);
    expect(setCookieHeaders).toContain(`Expires=${fakeRefreshExpiry.toUTCString()}`);

    expect(setCookieHeaders).toContain('=true');
    expect(setCookieHeaders).toContain(`Expires=${fakeRefreshExpiry.toUTCString()}`);

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith({
      userId: userId,
      token: 'SIGNED_REFRESH_TOKEN_VALUE',
      pcIdToken: idToken,
      expiresAt: fakeRefreshExpiry,
    });
  });

  it('createRedirectUrl: should append only the error parameter when errorDescription is undefined', () => {
    const errorParams = { error: 'SOME_ERROR_CODE', errorDescription: undefined };

    const resultUrl = authHelper.createRedirectUrl(errorParams);

    expect(resultUrl.origin + resultUrl.pathname).toBe('https://frontend.example.com/login');

    expect(resultUrl.searchParams.get('error')).toBe('SOME_ERROR_CODE');
    expect(resultUrl.searchParams.has('error_description')).toBe(false);
  });

  it('createRedirectUrl: should append both error and error_description when errorDescription is provided', () => {
    const errorParams = {
      error: 'ANOTHER_ERROR',
      errorDescription: 'Something went wrong',
    };

    const resultUrl = authHelper.createRedirectUrl(errorParams);

    expect(resultUrl.origin + resultUrl.pathname).toBe('https://frontend.example.com/login');

    expect(resultUrl.searchParams.get('error')).toBe('ANOTHER_ERROR');
    expect(resultUrl.searchParams.get('error_description')).toBe('Something went wrong');
  });

  it('authUser: should redirect to error page when createSession fails with an SESSION_ALREADY_EXISTS error code', async () => {
    const userId = 'user-123';
    const idToken = 'the-PC-id-token';

    const now = Date.now();
    const TEN_DAYS = 1000 * 60 * 60 * 24 * 10;
    const TWENTY_DAYS = 1000 * 60 * 60 * 24 * 20;

    const fakeAuthExpiry = new Date(now + TEN_DAYS);
    const fakeRefreshExpiry = new Date(now + TWENTY_DAYS);

    vi.mocked(getJwtExpirationDate).mockImplementation((duration) =>
      duration === envVars.AUTH_TOKEN_EXPIRATION ? fakeAuthExpiry : fakeRefreshExpiry,
    );

    vi.mocked(signRefreshCookie).mockReturnValueOnce('SIGNED_REFRESH_TOKEN_VALUE');
    vi.mocked(signAuthCookie).mockReturnValueOnce('SIGNED_AUTH_TOKEN_VALUE');
    vi.mocked(createSession).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
        meta: {
          target: ['Session', 'userId'],
        },
      }),
    );
    vi.mocked(prismaHelpers.isPrismaUniqueConstraintError).mockReturnValueOnce(true);

    const app = new Hono<{ Bindings: AppBindings }>()
      .use(pinoLogger())
      .get('/test', async (c: Context<AppBindings>) => {
        const res = await authHelper.authUser(c, { id: userId, roleId: 'PENDING' }, idToken);
        return res;
      });

    const client = testClient(app);

    const res = await client.test.$get();

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toMatch(AUTH_ERROR_CODES.SESSION_ALREADY_EXISTS);
  });

  it('authUser: should redirect to error page when createSession fails with an SESSION_CREATE_ERROR error code', async () => {
    const userId = 'user-123';
    const idToken = 'the-PC-id-token';

    const now = Date.now();
    const TEN_DAYS = 1000 * 60 * 60 * 24 * 10;
    const TWENTY_DAYS = 1000 * 60 * 60 * 24 * 20;

    const fakeAuthExpiry = new Date(now + TEN_DAYS);
    const fakeRefreshExpiry = new Date(now + TWENTY_DAYS);

    vi.mocked(getJwtExpirationDate).mockImplementation((duration) =>
      duration === envVars.AUTH_TOKEN_EXPIRATION ? fakeAuthExpiry : fakeRefreshExpiry,
    );

    vi.mocked(signRefreshCookie).mockReturnValueOnce('SIGNED_REFRESH_TOKEN_VALUE');
    vi.mocked(signAuthCookie).mockReturnValueOnce('SIGNED_AUTH_TOKEN_VALUE');
    vi.mocked(createSession).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
        meta: {
          target: ['Session', 'userId'],
        },
      }),
    );
    vi.mocked(prismaHelpers.isPrismaUniqueConstraintError).mockReturnValueOnce(false);

    const app = new Hono<{ Bindings: AppBindings }>()
      .use(pinoLogger())
      .get('/test', async (c: Context<AppBindings>) => {
        const res = await authHelper.authUser(c, { id: userId, roleId: 'PENDING' }, idToken);
        return res;
      });

    const client = testClient(app);

    const res = await client.test.$get();

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toMatch(AUTH_ERROR_CODES.SESSION_CREATE_ERROR);
  });
});
