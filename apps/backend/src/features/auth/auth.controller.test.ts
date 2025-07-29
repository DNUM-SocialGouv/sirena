import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import type { IDToken, TokenEndpointResponse, TokenEndpointResponseHelpers } from 'openid-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { envVars } from '@/config/env';
import { deleteSession, getSession } from '@/features/sessions/sessions.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import pinoLogger from '@/middlewares/pino.middleware';
import AuthController from './auth.controller';
import { authUser } from './auth.helper';
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  fetchUserInfo,
  getOrCreateUser,
} from './auth.service';

vi.mock('./auth.service', () => ({
  buildAuthorizationUrl: vi.fn(),
  buildEndSessionUrl: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  fetchUserInfo: vi.fn(),
  getOrCreateUser: vi.fn(),
}));

vi.mock('./auth.helper', () => ({
  authUser: vi.fn(),
  createRedirectUrl: vi.fn(),
}));

vi.mock('@/features/sessions/sessions.service', () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  envVars: {
    PC_REDIRECT_URI: 'https://example.com/redirect',
    REFRESH_TOKEN_NAME: 'refreshToken',
    AUTH_TOKEN_NAME: 'authToken',
    IS_LOGGED_TOKEN_NAME: 'isLoggedIn',
    FRONTEND_REDIRECT_URI: 'https://frontend.example.com/redirect',
    FRONTEND_REDIRECT_LOGIN_URI: 'https://frontend.example.com/login',
  },
}));

vi.mock('@/middlewares/logout.middleware', () => {
  return {
    default: (_c: Context, next: () => Promise<Next>) => {
      return next();
    },
  };
});

describe('Auth endpoints: /auth', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const app = appWithLogs.createApp().use(pinoLogger()).route('/', AuthController).onError(errorHandler);
  const client = testClient(app);

  describe('POST /login', () => {
    it('should redirect to the authorization URL and set cookies', async () => {
      const fakeData = {
        redirectTo: new URL('https://example.com/auth'),
        nonce: 'fakeNonce',
        state: 'fakeState',
      };

      vi.mocked(buildAuthorizationUrl).mockResolvedValueOnce(fakeData);

      const res = await client.login.$post();
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(fakeData.redirectTo.href);
      expect(res.headers.get('Set-Cookie')).toContain(`state=${fakeData.state}; Path=/; HttpOnly`);
      expect(res.headers.get('Set-Cookie')).toContain(`nonce=${fakeData.nonce}; Path=/; HttpOnly`);
    });
  });

  describe('POST /logout', () => {
    it('should clear cookies and redirect to FRONTEND_REDIRECT_LOGIN_URI', async () => {
      const fakeTokenValue = 'dummyRefreshToken123';
      const cookieHeader = `${envVars.REFRESH_TOKEN_NAME}=${fakeTokenValue}`;

      const res = await client.logout.$post(undefined, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(res.status).toBe(302);
      expect(deleteSession).toHaveBeenCalledTimes(1);
      expect(deleteSession).toHaveBeenCalledWith(fakeTokenValue);

      const setCookieHeaders = res.headers.get('Set-Cookie');
      expect(setCookieHeaders).toContain(`${envVars.AUTH_TOKEN_NAME}=; Max-Age=0; Path=/`);
      expect(setCookieHeaders).toContain(`${envVars.REFRESH_TOKEN_NAME}=; Max-Age=0; Path=/`);
      expect(setCookieHeaders).toContain(`${envVars.IS_LOGGED_TOKEN_NAME}=; Max-Age=0; Path=/`);
      expect(res.headers.get('Location')).toBe(envVars.FRONTEND_REDIRECT_LOGIN_URI);
    });
  });

  describe('POST /logout-proconnect', () => {
    it('deletes session and redirects to the endSessionUrl when getSession(token) and buildEndSessionUrl succeed', async () => {
      const fakeTokenValue = 'dummyRefreshToken123';
      const cookieHeader = `${envVars.REFRESH_TOKEN_NAME}=${fakeTokenValue}`;

      const fakeSession = {
        id: '1',
        userId: '1',
        token: 'dummyRefreshToken123',
        expiresAt: new Date(),
        pcIdToken: '1',
        createdAt: new Date(),
      };
      vi.mocked(getSession).mockResolvedValueOnce(fakeSession);

      const fakeEndUrl = new URL('https://connect.example.com/end-session?foo=bar');
      vi.mocked(buildEndSessionUrl).mockResolvedValueOnce(fakeEndUrl);

      const res = await client['logout-proconnect'].$post(undefined, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(getSession).toHaveBeenCalledTimes(1);
      expect(getSession).toHaveBeenCalledWith(fakeTokenValue);

      expect(buildEndSessionUrl).toHaveBeenCalledTimes(1);
      expect(buildEndSessionUrl).toHaveBeenCalledWith(fakeSession.pcIdToken);

      expect(deleteSession).toHaveBeenCalledTimes(1);
      expect(deleteSession).toHaveBeenCalledWith(fakeTokenValue);

      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(fakeEndUrl.href);

      const setCookieHeaders = res.headers.get('Set-Cookie');
      expect(setCookieHeaders).toContain(`${envVars.AUTH_TOKEN_NAME}=; Max-Age=0; Path=/`);
      expect(setCookieHeaders).toContain(`${envVars.REFRESH_TOKEN_NAME}=; Max-Age=0; Path=/`);
      expect(setCookieHeaders).toContain(`${envVars.IS_LOGGED_TOKEN_NAME}=; Max-Age=0; Path=/`);
    });
  });

  describe('GET /callback', () => {
    it('should handle successful login, create user and redirect to FRONTEND_REDIRECT_URI', async () => {
      const stateValue = 'some-random-state';
      const nonceValue = 'some-random-nonce';
      const cookieHeader = `state=${stateValue}; nonce=${nonceValue}`;

      const fakeTokens = {
        access_token: 'validAccessToken123',
        id_token: 'validIdToken123',
        refresh_token: 'validRefreshToken123',
        claims: () =>
          ({
            iss: 'a',
            sub: 'a',
            aud: 'a',
            iat: 1,
            exp: 1,
          }) as IDToken,
      } as unknown as TokenEndpointResponse & TokenEndpointResponseHelpers;

      vi.mocked(authorizationCodeGrant).mockResolvedValueOnce(fakeTokens);

      const fakeUserInfo = {
        email: 'alice@example.com',
        given_name: 'Alice',
        usual_name: 'Smith',
        sub: 'oidc-subject-xyz',
        uid: 42,
      };
      vi.mocked(fetchUserInfo).mockResolvedValueOnce(fakeUserInfo);

      const createdUser = {
        id: 'new-user',
        sub: fakeUserInfo.sub,
        uid: String(fakeUserInfo.uid),
        email: fakeUserInfo.email,
        firstName: fakeUserInfo.given_name,
        lastName: fakeUserInfo.usual_name,
        createdAt: new Date(),
        active: false,
        roleId: 'PENDING',
        statutId: 'NON_RENSEIGNE',
        entiteId: null,
        pcData: {},
      };
      vi.mocked(getOrCreateUser).mockResolvedValueOnce(createdUser);

      vi.mocked(authUser).mockResolvedValueOnce(undefined);

      const res = await client.callback.$get(
        {
          query: {
            code: 'validCode123',
            state: stateValue,
          },
        },
        {
          headers: {
            Cookie: cookieHeader,
          },
        },
      );

      expect(fetchUserInfo).toHaveBeenCalledTimes(1);
      expect(fetchUserInfo).toHaveBeenCalledWith(fakeTokens.access_token, fakeTokens.claims());

      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(envVars.FRONTEND_REDIRECT_URI);
    });
  });
});
