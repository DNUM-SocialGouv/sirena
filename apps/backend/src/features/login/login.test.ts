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
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
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

      const res = await client.index.$get();

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

      const res = await client.index.$get();

      const json = await res.text();
      const url = res.headers.get('Location');
      expect(url).toEqual('http://example.com?access_token=Bearer token&id_token=id&state=toto');
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

      const res = await client.index.$get();

      await res.text();
      expect(doSomethingWithUserInformation).toHaveBeenCalledOnce();
      expect(doSomethingWithUserInformation).toHaveBeenCalledWith('user informations');
    });
  });
});
