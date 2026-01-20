import type {
  Configuration,
  IDToken,
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
  UserInfoResponse,
} from 'openid-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entite, User } from '../../libs/prisma.js';
import type { UserInfo } from './auth.type.js';

vi.mock('../../config/env.js', () => ({
  envVars: {
    PC_DOMAIN: 'https://proconnect.example.com',
    PC_CLIENT_ID: 'test-client-id',
    PC_ID_TOKEN_SIGNED_RESPONSE_ALG: 'RS256',
    PC_USERINFO_SIGNED_RESPONSE_ALG: 'RS256',
    FRONTEND_REDIRECT_LOGIN_URI: 'https://frontend.example.com/login',
  },
}));

vi.mock('../../config/openID.js', () => ({
  authorizationParams: {
    scope: 'scope',
    response_type: 'response_type',
  },
}));

vi.mock('../entites/entites.service.js', () => ({
  getEntiteForUser: vi.fn(),
}));

vi.mock('../users/users.service.js', () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
}));

async function loadAuthWithOpenIdMock() {
  vi.resetModules();

  vi.doMock('openid-client', () => ({
    discovery: vi.fn(),
    ClientSecretPost: vi.fn().mockReturnValue('client-secret-post'),
    allowInsecureRequests: 'allowInsecureRequests',

    authorizationCodeGrant: vi.fn(),
    fetchUserInfo: vi.fn(),
    randomNonce: vi.fn(),
    randomState: vi.fn(),
    buildAuthorizationUrl: vi.fn(),
    buildEndSessionUrl: vi.fn(),
  }));

  const client = await import('openid-client');
  const auth = await import('../auth/auth.service.js');

  return { client, auth };
}

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('objectToQueryParams()', () => {
    it('should skip undefined, null, empty, and falsey values but stringify objects/arrays', async () => {
      const {
        auth: { objectToQueryParams },
      } = await loadAuthWithOpenIdMock();

      const input = {
        foo: 'bar',
        emptyString: '',
        zero: 0,
        isFalse: false,
        isNull: null,
        isUndefined: undefined,
        anArray: [1, 2, 3],
        anObject: { a: 1, b: 'two' },
      };

      const params = objectToQueryParams(input);
      const result: Record<string, string> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });

      expect(result).toHaveProperty('foo', 'bar');
      expect(result).not.toHaveProperty('emptyString');
      expect(result).not.toHaveProperty('zero');
      expect(result).not.toHaveProperty('isFalse');
      expect(result).not.toHaveProperty('isNull');
      expect(result).not.toHaveProperty('isUndefined');
      expect(result).toHaveProperty('anArray', JSON.stringify([1, 2, 3]));
      expect(result).toHaveProperty('anObject', JSON.stringify({ a: 1, b: 'two' }));
    });

    it('should handle string/number/boolean values correctly', async () => {
      const {
        auth: { objectToQueryParams },
      } = await loadAuthWithOpenIdMock();

      const input = { string: 'test', number: 123, boolean: true };

      const params = objectToQueryParams(input);
      const result: Record<string, string> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });

      expect(result).toHaveProperty('string', 'test');
      expect(result).toHaveProperty('number', '123');
      expect(result).toHaveProperty('boolean', 'true');
    });
  });

  describe('getProviderConfig()', () => {
    it('should return cached config if already initialized', async () => {
      const {
        client,
        auth: { getProviderConfig },
      } = await loadAuthWithOpenIdMock();

      const mockConfig = { id: 'test-config' } as unknown as Configuration;
      vi.mocked(client.discovery).mockResolvedValueOnce(mockConfig);

      const r1 = await getProviderConfig();
      const r2 = await getProviderConfig();

      expect(r1).toBe(mockConfig);
      expect(r2).toBe(mockConfig);
      expect(client.discovery).toHaveBeenCalledTimes(1);
    });

    it('should initialize config on first call', async () => {
      const {
        client,
        auth: { getProviderConfig },
      } = await loadAuthWithOpenIdMock();

      const mockConfig = { id: 'test-config' } as unknown as Configuration;
      vi.mocked(client.discovery).mockResolvedValueOnce(mockConfig);

      const result = await getProviderConfig();

      expect(result).toEqual(mockConfig);
      expect(client.discovery).toHaveBeenCalledWith(
        new URL('https://proconnect.example.com'),
        'test-client-id',
        {
          id_token_signed_response_alg: 'RS256',
          userinfo_signed_response_alg: 'RS256',
        },
        'client-secret-post',
        { execute: ['allowInsecureRequests'] },
      );
    });

    it('should initialize config without allowInsecureRequests when IS_HTTP_PROTOCOL_FORBIDDEN is True', async () => {
      const originalEnv = process.env.IS_HTTP_PROTOCOL_FORBIDDEN;
      process.env.IS_HTTP_PROTOCOL_FORBIDDEN = 'True';

      const {
        client,
        auth: { getProviderConfig },
      } = await loadAuthWithOpenIdMock();

      const mockConfig = { id: 'test-config' } as unknown as Configuration;
      vi.mocked(client.discovery).mockResolvedValueOnce(mockConfig);

      const result = await getProviderConfig();

      expect(result).toEqual(mockConfig);
      expect(client.discovery).toHaveBeenCalledWith(
        new URL('https://proconnect.example.com'),
        'test-client-id',
        {
          id_token_signed_response_alg: 'RS256',
          userinfo_signed_response_alg: 'RS256',
        },
        'client-secret-post',
        undefined,
      );

      process.env.IS_HTTP_PROTOCOL_FORBIDDEN = originalEnv;
    });
  });

  describe('getTokens()', () => {
    it('should call authorizationCodeGrant with correct parameters', async () => {
      const {
        client,
        auth: { getTokens },
      } = await loadAuthWithOpenIdMock();

      const mockConfig = { id: 'test-config' } as unknown as Configuration;
      const mockTokens = { access_token: 'token', id_token: 'id-token' } as TokenEndpointResponse &
        TokenEndpointResponseHelpers;
      const currentUrl = new URL('https://example.com/callback');
      const nonce = 'test-nonce';
      const state = 'test-state';

      vi.mocked(client.discovery).mockResolvedValueOnce(mockConfig);
      vi.mocked(client.authorizationCodeGrant).mockResolvedValueOnce(mockTokens);

      const result = await getTokens(currentUrl, nonce, state);

      expect(result).toBe(mockTokens);
      expect(client.authorizationCodeGrant).toHaveBeenCalledWith(mockConfig, currentUrl, {
        expectedNonce: nonce,
        expectedState: state,
      });
    });
  });

  describe('fetchUserInfo()', () => {
    it('should call fetchUserInfo with correct parameters', async () => {
      const {
        client,
        auth: { fetchUserInfo },
      } = await loadAuthWithOpenIdMock();

      const mockConfig = { id: 'test-config' } as unknown as Configuration;
      const mockUserInfo = { email: 'test@example.com', sub: 'user123' } as UserInfoResponse;
      const accessToken = 'access-token';
      const claims = { sub: 'user123' } as IDToken;

      vi.mocked(client.discovery).mockResolvedValueOnce(mockConfig);
      vi.mocked(client.fetchUserInfo).mockResolvedValueOnce(mockUserInfo);

      const result = await fetchUserInfo(accessToken, claims);

      expect(result).toBe(mockUserInfo);
      expect(client.fetchUserInfo).toHaveBeenCalledWith(mockConfig, accessToken, 'user123');
    });
  });

  describe('buildEndSessionUrl()', () => {
    it('should build end session URL with correct parameters', async () => {
      const {
        client,
        auth: { buildEndSessionUrl },
      } = await loadAuthWithOpenIdMock();

      const mockConfig = { id: 'test-config' } as unknown as Configuration;
      const mockUrl = new URL('https://proconnect.example.com/logout');
      const idTokenHint = 'id-token-hint';

      vi.mocked(client.discovery).mockResolvedValueOnce(mockConfig);
      vi.mocked(client.buildEndSessionUrl).mockReturnValueOnce(mockUrl);

      const result = await buildEndSessionUrl(idTokenHint);

      expect(result).toBe(mockUrl);
      expect(client.buildEndSessionUrl).toHaveBeenCalledWith(mockConfig, expect.any(URLSearchParams));
    });
  });

  describe('buildAuthorizationUrl()', () => {
    it('should build authorization URL with nonce and state', async () => {
      const {
        client,
        auth: { buildAuthorizationUrl },
      } = await loadAuthWithOpenIdMock();

      const mockConfig = { id: 'test-config' } as unknown as Configuration;
      const mockUrl = new URL('https://proconnect.example.com/auth');
      const nonce = 'test-nonce';
      const state = 'test-state';

      vi.mocked(client.discovery).mockResolvedValueOnce(mockConfig);
      vi.mocked(client.randomNonce).mockReturnValueOnce(nonce);
      vi.mocked(client.randomState).mockReturnValueOnce(state);
      vi.mocked(client.buildAuthorizationUrl).mockReturnValueOnce(mockUrl);

      const result = await buildAuthorizationUrl();

      expect(result).toEqual({ redirectTo: mockUrl, nonce, state });
      expect(client.randomNonce).toHaveBeenCalled();
      expect(client.randomState).toHaveBeenCalled();
      expect(client.buildAuthorizationUrl).toHaveBeenCalledWith(mockConfig, expect.any(URLSearchParams));
    });
  });

  describe('authorizationCodeGrant()', () => {
    it('should call authorizationCodeGrant with correct parameters', async () => {
      const {
        client,
        auth: { authorizationCodeGrant },
      } = await loadAuthWithOpenIdMock();

      const mockConfig = { id: 'test-config' } as unknown as Configuration;
      const mockTokens = { access_token: 'token', id_token: 'id-token' } as TokenEndpointResponse &
        TokenEndpointResponseHelpers;
      const currentUrl = new URL('https://example.com/callback');
      const state = 'test-state';
      const nonce = 'test-nonce';

      vi.mocked(client.discovery).mockResolvedValueOnce(mockConfig);
      vi.mocked(client.authorizationCodeGrant).mockResolvedValueOnce(mockTokens);

      const result = await authorizationCodeGrant(currentUrl, state, nonce);

      expect(result).toBe(mockTokens);
      expect(client.authorizationCodeGrant).toHaveBeenCalledWith(mockConfig, currentUrl, {
        expectedState: state,
        expectedNonce: nonce,
        idTokenExpected: true,
      });
    });
  });

  describe('getOrCreateUser()', () => {
    it('should return existing user if found', async () => {
      const {
        auth: { getOrCreateUser },
      } = await loadAuthWithOpenIdMock();
      const { getEntiteForUser } = await import('../entites/entites.service.js');
      const { createUser, getUserByEmail } = await import('../users/users.service.js');

      const existingUser = { id: 'user1', email: 'test@example.com' } as User;
      vi.mocked(getUserByEmail).mockResolvedValueOnce(existingUser);

      const mockUserInfo: UserInfo = {
        sub: 'user123',
        uid: 'uid123',
        email: 'test@example.com',
        prenom: 'John',
        nom: 'Doe',
        organizationUnit: 'Test Org',
        pcData: { email: 'test@example.com', sub: 'user123' } as UserInfoResponse,
      };

      const result = await getOrCreateUser(mockUserInfo);

      expect(result).toBe(existingUser);
      expect(getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(createUser).not.toHaveBeenCalled();
      expect(getEntiteForUser).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      const {
        auth: { getOrCreateUser },
      } = await loadAuthWithOpenIdMock();
      const { getEntiteForUser } = await import('../entites/entites.service.js');
      const { createUser, getUserByEmail } = await import('../users/users.service.js');

      const newUser = { id: 'user2', email: 'test@example.com' } as User;
      const mockEntite = { id: 'entite1' } as Entite;

      vi.mocked(getUserByEmail).mockResolvedValueOnce(null);
      vi.mocked(getEntiteForUser).mockResolvedValueOnce(mockEntite);
      vi.mocked(createUser).mockResolvedValueOnce(newUser);

      const mockUserInfo: UserInfo = {
        sub: 'user123',
        uid: 'uid123',
        email: 'test@example.com',
        prenom: 'John',
        nom: 'Doe',
        organizationUnit: 'Test Org',
        pcData: { email: 'test@example.com', sub: 'user123' } as UserInfoResponse,
      };

      const result = await getOrCreateUser(mockUserInfo);

      expect(result).toBe(newUser);
      expect(getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(getEntiteForUser).toHaveBeenCalledWith('Test Org', 'test@example.com');
      expect(createUser).toHaveBeenCalledWith({
        sub: 'user123',
        uid: 'uid123',
        email: 'test@example.com',
        prenom: 'John',
        nom: 'Doe',
        pcData: mockUserInfo,
        entiteId: 'entite1',
      });
    });

    it('should handle null/empty/complex organization unit', async () => {
      const {
        auth: { getOrCreateUser },
      } = await loadAuthWithOpenIdMock();
      const { getEntiteForUser } = await import('../entites/entites.service.js');
      const { createUser, getUserByEmail } = await import('../users/users.service.js');

      vi.mocked(getUserByEmail).mockResolvedValue(null);
      vi.mocked(getEntiteForUser).mockResolvedValue(null);
      vi.mocked(createUser).mockResolvedValue({ id: 'userX', email: 't@example.com' } as User);

      await getOrCreateUser({
        sub: 's',
        uid: 'u',
        email: 't@example.com',
        prenom: 'F',
        nom: 'L',
        organizationUnit: null,
        pcData: { email: 't@example.com', sub: 's' } as UserInfoResponse,
      } as UserInfo);
      expect(getEntiteForUser).toHaveBeenCalledWith(null, 't@example.com');

      await getOrCreateUser({
        sub: 's',
        uid: 'u',
        email: 't@example.com',
        prenom: 'F',
        nom: 'L',
        organizationUnit: '',
        pcData: { email: 't@example.com', sub: 's' } as UserInfoResponse,
      } as UserInfo);
      expect(getEntiteForUser).toHaveBeenCalledWith(null, 't@example.com');

      await getOrCreateUser({
        sub: 's',
        uid: 'u',
        email: 't@example.com',
        prenom: 'F',
        nom: 'L',
        organizationUnit: 'Org1/Dept/Team',
        pcData: { email: 't@example.com', sub: 's' } as UserInfoResponse,
      } as UserInfo);
      expect(getEntiteForUser).toHaveBeenCalledWith('Org1', 't@example.com');
    });
  });
});
