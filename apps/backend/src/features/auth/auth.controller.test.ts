import { AUTH_ERROR_CODES } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import type { IDToken, TokenEndpointResponse, TokenEndpointResponseHelpers, UserInfoResponse } from 'openid-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { envVars } from '@/config/env';
import { deleteSession, getSession } from '@/features/sessions/sessions.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import * as prismaHelpers from '@/helpers/prisma';
import pinoLogger from '@/middlewares/pino.middleware';
import AuthController from './auth.controller';
import { authUser, createRedirectUrl } from './auth.helper';
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  fetchUserInfo,
  getOrCreateUser,
} from './auth.service';

vi.mock('@/helpers/prisma', () => ({
  isPrismaUniqueConstraintError: vi.fn(),
}));

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

    it('should redirect to error page when buildAuthorizationUrl fails', async () => {
      vi.mocked(buildAuthorizationUrl).mockRejectedValueOnce(new Error('test'));

      const res = await client.login.$post();
      expect(res.status).toBe(302);
      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.PC_ERROR });
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
    });

    it('should handle PrismaUniqueConstraintError when deleteSession throws', async () => {
      const fakeTokenValue = 'dummyRefreshToken123';
      const cookieHeader = `${envVars.REFRESH_TOKEN_NAME}=${fakeTokenValue}`;

      vi.mocked(deleteSession).mockRejectedValueOnce(new Error('test'));
      vi.mocked(prismaHelpers.isPrismaUniqueConstraintError).mockReturnValueOnce(true);

      const res = await client.logout.$post(undefined, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(res.status).toBe(302);
      expect(deleteSession).toHaveBeenCalledTimes(1);
      expect(deleteSession).toHaveBeenCalledWith(fakeTokenValue);
    });

    it('should handle generic error when deleteSession throws', async () => {
      const fakeTokenValue = 'dummyRefreshToken123';
      const cookieHeader = `${envVars.REFRESH_TOKEN_NAME}=${fakeTokenValue}`;

      vi.mocked(deleteSession).mockRejectedValueOnce(new Error('test'));
      vi.mocked(prismaHelpers.isPrismaUniqueConstraintError).mockReturnValueOnce(false);

      const res = await client.logout.$post(undefined, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(res.status).toBe(302);
      expect(deleteSession).toHaveBeenCalledTimes(1);
      expect(deleteSession).toHaveBeenCalledWith(fakeTokenValue);
    });

    it('should handle logout when no session token is found', async () => {
      const res = await client.logout.$post();

      expect(res.status).toBe(302);
      expect(deleteSession).not.toHaveBeenCalled();

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

    it('should redirect to FRONTEND_REDIRECT_LOGIN_URI when no session token is found', async () => {
      const res = await client['logout-proconnect'].$post();

      expect(res.status).toBe(302);
      expect(getSession).not.toHaveBeenCalled();
      expect(buildEndSessionUrl).not.toHaveBeenCalled();
      expect(deleteSession).not.toHaveBeenCalled();
    });

    it('should redirect to FRONTEND_REDIRECT_LOGIN_URI when no session is found', async () => {
      const fakeTokenValue = 'dummyRefreshToken123';
      const cookieHeader = `${envVars.REFRESH_TOKEN_NAME}=${fakeTokenValue}`;

      vi.mocked(getSession).mockResolvedValueOnce(null);

      const res = await client['logout-proconnect'].$post(undefined, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(res.status).toBe(302);
      expect(getSession).toHaveBeenCalledTimes(1);
      expect(getSession).toHaveBeenCalledWith(fakeTokenValue);
      expect(buildEndSessionUrl).not.toHaveBeenCalled();
      expect(deleteSession).not.toHaveBeenCalled();
    });

    it('should redirect to error page when buildEndSessionUrl throws', async () => {
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

      vi.mocked(buildEndSessionUrl).mockRejectedValueOnce(new Error('test'));

      const res = await client['logout-proconnect'].$post(undefined, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(res.status).toBe(302);
      expect(getSession).toHaveBeenCalledTimes(1);
      expect(getSession).toHaveBeenCalledWith(fakeTokenValue);
      expect(buildEndSessionUrl).toHaveBeenCalledTimes(1);
      expect(buildEndSessionUrl).toHaveBeenCalledWith(fakeSession.pcIdToken);
      expect(deleteSession).not.toHaveBeenCalled();
      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.PC_ERROR });
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
        prenom: fakeUserInfo.given_name,
        nom: fakeUserInfo.usual_name,
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

    it('should redirect to error page when error is present in the query params', async () => {
      const stateValue = 'some-random-state';
      const nonceValue = 'some-random-nonce';
      const cookieHeader = `state=${stateValue}; nonce=${nonceValue}`;

      const res = await client.callback.$get(
        {
          query: {
            code: 'validCode123',
            state: stateValue,
            error: 'ERROR_CODE',
          },
        },
        {
          headers: {
            Cookie: cookieHeader,
          },
        },
      );

      expect(createRedirectUrl).toHaveBeenCalledWith({
        error: AUTH_ERROR_CODES.PC_ERROR,
        errorDescription: 'ERROR_CODE',
      });
      expect(res.status).toBe(302);
    });

    it('should redirect to error page when state is missing from user cookie', async () => {
      const nonceValue = 'some-random-nonce';
      const cookieHeader = `nonce=${nonceValue}`;

      const res = await client.callback.$get(
        {
          query: {
            code: 'validCode123',
            state: 'some-random-state',
          },
        },
        {
          headers: {
            Cookie: cookieHeader,
          },
        },
      );

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.STATE_NOT_VALID });
      expect(res.status).toBe(302);
    });

    it('should redirect to error page when nonce is missing from user cookie', async () => {
      const stateValue = 'some-random-state';
      const cookieHeader = `state=${stateValue}`;

      const res = await client.callback.$get(
        {
          query: {
            code: 'validCode123',
            state: 'some-random-state',
          },
        },
        {
          headers: {
            Cookie: cookieHeader,
          },
        },
      );

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.STATE_NOT_VALID });
      expect(res.status).toBe(302);
    });

    it('should redirect to error page when authorizationCodeGrant fails', async () => {
      const stateValue = 'some-random-state';
      const nonceValue = 'some-random-nonce';
      const cookieHeader = `state=${stateValue}; nonce=${nonceValue}`;

      vi.mocked(authorizationCodeGrant).mockRejectedValueOnce(new Error('test'));

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

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.TOKENS_NOT_VALID });
      expect(res.status).toBe(302);
    });

    it('should redirect to error page when tokens are missing from authorizationCodeGrant', async () => {
      const stateValue = 'some-random-state';
      const nonceValue = 'some-random-nonce';
      const cookieHeader = `state=${stateValue}; nonce=${nonceValue}`;

      vi.mocked(authorizationCodeGrant).mockResolvedValueOnce(
        {} as TokenEndpointResponse & TokenEndpointResponseHelpers,
      );

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

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.TOKENS_NOT_VALID });
      expect(res.status).toBe(302);
    });

    it('should redirect to error page when claims are missing from tokens', async () => {
      const stateValue = 'some-random-state';
      const nonceValue = 'some-random-nonce';
      const cookieHeader = `state=${stateValue}; nonce=${nonceValue}`;

      vi.mocked(authorizationCodeGrant).mockResolvedValueOnce({
        claims: () => undefined,
        access_token: 'validAccessToken123',
        id_token: 'validIdToken123',
        refresh_token: 'validRefreshToken123',
      } as TokenEndpointResponse & TokenEndpointResponseHelpers);

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

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.CLAIMS_NOT_VALID });
      expect(res.status).toBe(302);
    });

    it('should redirect to error page when userInfo is missing from fetchUserInfo', async () => {
      const stateValue = 'some-random-state';
      const nonceValue = 'some-random-nonce';
      const cookieHeader = `state=${stateValue}; nonce=${nonceValue}`;

      vi.mocked(authorizationCodeGrant).mockResolvedValueOnce({
        claims: () =>
          ({
            iss: 'a',
            sub: 'a',
            aud: 'a',
            iat: 1,
            exp: 1,
          }) as IDToken,
        access_token: 'validAccessToken123',
        id_token: 'validIdToken123',
        refresh_token: 'validRefreshToken123',
      } as TokenEndpointResponse & TokenEndpointResponseHelpers);

      vi.mocked(fetchUserInfo).mockRejectedValueOnce(new Error('test'));

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

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.USER_INFOS_ERROR });
      expect(res.status).toBe(302);
    });

    it('should redirect to error page when userInfo is missing from fetchUserInfo', async () => {
      const stateValue = 'some-random-state';
      const nonceValue = 'some-random-nonce';
      const cookieHeader = `state=${stateValue}; nonce=${nonceValue}`;

      vi.mocked(authorizationCodeGrant).mockResolvedValueOnce({
        claims: () =>
          ({
            iss: 'a',
            sub: 'a',
            aud: 'a',
            iat: 1,
            exp: 1,
          }) as IDToken,
        access_token: 'validAccessToken123',
        id_token: 'validIdToken123',
        refresh_token: 'validRefreshToken123',
      } as TokenEndpointResponse & TokenEndpointResponseHelpers);

      vi.mocked(fetchUserInfo).mockResolvedValueOnce({} as UserInfoResponse);

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

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.CLAIMS_NOT_VALID });
      expect(res.status).toBe(302);
    });

    it('should handle userInfo with organizational_unit and pass it to getOrCreateUser', async () => {
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
        email: 'bob@example.com',
        given_name: 'Bob',
        usual_name: 'Johnson',
        sub: 'oidc-subject-xyz',
        uid: 42,
        organizational_unit: 'Ministère de la Santé/Direction Générale',
      };
      vi.mocked(fetchUserInfo).mockResolvedValueOnce(fakeUserInfo);

      const createdUser = {
        id: 'new-user',
        sub: fakeUserInfo.sub,
        uid: String(fakeUserInfo.uid),
        email: fakeUserInfo.email,
        prenom: fakeUserInfo.given_name,
        nom: fakeUserInfo.usual_name,
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

      expect(getOrCreateUser).toHaveBeenCalledWith({
        sub: fakeUserInfo.sub,
        uid: String(fakeUserInfo.uid),
        email: fakeUserInfo.email,
        prenom: fakeUserInfo.given_name,
        nom: String(fakeUserInfo.usual_name),
        pcData: fakeUserInfo,
        organizationUnit: String(fakeUserInfo.organizational_unit),
      });

      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(envVars.FRONTEND_REDIRECT_URI);
    });

    it('should redirect to error page when getOrCreateUser throws', async () => {
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

      vi.mocked(getOrCreateUser).mockRejectedValueOnce(new Error('test'));

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

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.USER_CREATE_ERROR });
      expect(res.status).toBe(302);
    });

    it('should redirect to error page when getOrCreateUser throws generic error on prisma unique constraint error', async () => {
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
        email: 'bob@example.com',
        given_name: 'Bob',
        usual_name: 'Johnson',
        sub: 'oidc-subject-xyz',
        uid: 42,
      };
      vi.mocked(fetchUserInfo).mockResolvedValueOnce(fakeUserInfo);

      vi.mocked(getOrCreateUser).mockRejectedValueOnce(new Error('test'));
      vi.mocked(prismaHelpers.isPrismaUniqueConstraintError).mockReturnValueOnce(true);

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

      expect(createRedirectUrl).toHaveBeenCalledWith({ error: AUTH_ERROR_CODES.USER_ALREADY_EXISTS });
      expect(res.status).toBe(302);
    });
  });
});
