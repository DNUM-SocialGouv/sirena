import { testClient } from 'hono/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from './login.controller.ts';
import { getLogin, getLoginInfo } from './login.service.ts';
const doSomethingWithUserInformation = vi.fn();

describe('Login endPoint', () => {
  beforeEach(() => {
    vi.mock('./login.service.ts', () => ({
      getLogin: vi.fn(),
      getLoginInfo: vi.fn(),
    }));
    const consoleMock = vi.spyOn(console, 'log').mockImplementation(doSomethingWithUserInformation);
    vi.stubEnv('FRONTEND_REDIRECT_URI', 'http://example.com');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-16T13:57:41.000Z'));
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
  const client = testClient(app);
  describe('with good return values', () => {
    it('GET / Should redirect to any page', async () => {
      const fakeData = {
        tokens: {
          access_token: 'Bearer token',
          id_token: 'id',
        },
        state: 'toto',
        code: undefined,
        iss: undefined,
      };

      vi.mocked(getLogin).mockResolvedValue(fakeData);

      const res = await client.index.$get({
        query: { code: 'code', state: 'state', iss: 'iss' },
      });
      expect(res.status).toBe(302);
    });
    it('GET / Should redirect to the front login page', async () => {
      const fakeData = {
        tokens: {
          access_token: 'Bearer token',
          id_token: 'id',
        },
        state: 'toto',
        code: undefined,
        iss: undefined,
      };

      vi.mocked(getLogin).mockResolvedValue(fakeData);

      const res = await client.index.$get({
        query: { code: 'code', state: 'state', iss: 'iss' },
      });
      const json = await res.text();
      const url = res.headers.get('Location');
      expect(url).toEqual('http://example.com?state=toto');
    });
    it('should call doSomethingWithUserInformation with user informations', async () => {
      const fakeData = {
        tokens: {
          access_token: 'Bearer token',
          id_token: 'id',
        },
        state: 'toto',
        code: undefined,
        iss: undefined,
      };

      vi.mocked(getLogin).mockResolvedValue(fakeData);
      vi.mocked(getLoginInfo).mockResolvedValue('user informations');

      const res = await client.index.$get({
        query: { code: 'code', state: 'state', iss: 'iss' },
      });
      await res.text();
      expect(doSomethingWithUserInformation).toHaveBeenCalledOnce();
      expect(doSomethingWithUserInformation).toHaveBeenCalledWith('user informations');
    });
    it('should add the responses headers cookies to the response', async () => {
      const fakeData = {
        tokens: {
          access_token: 'Bearer token',
          id_token: 'id',
        },
        state: 'toto',
        code: undefined,
        iss: undefined,
      };

      vi.mocked(getLogin).mockResolvedValue(fakeData);
      vi.mocked(getLoginInfo).mockResolvedValue('user informations');

      const res = await client.index.$get({
        query: { code: 'code', state: 'state', iss: 'iss' },
      });
      await res.text();
      expect(res.headers.get('Set-Cookie')).toBeDefined();
      expect(res.headers.get('Set-Cookie')).toEqual(
        'id_token=Bearer%20id; Path=/; Expires=Sat, 17 May 2025 13:57:41 GMT; HttpOnly; Secure; SameSite=Strict, access_token=Bearer%20Bearer%20token; Path=/; Expires=Sat, 17 May 2025 13:57:41 GMT; HttpOnly; Secure; SameSite=Strict, is_logged=true; Path=/; Expires=Sat, 17 May 2025 13:57:41 GMT; Secure; SameSite=Strict',
      );
    });
  });
});
