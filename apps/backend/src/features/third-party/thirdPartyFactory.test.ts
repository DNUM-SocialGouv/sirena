import type { Context } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppBindings } from '../../helpers/factories/appWithLogs.js';
import { getRequiredApiKey } from './thirdPartyFactory.js';

const contextWith = (apiKey: unknown) => ({ get: () => apiKey }) as unknown as Context<AppBindings>;

describe('thirdPartyFactory.ts', () => {
  it('returns the API key set by the apiKeyAuth middleware', () => {
    const apiKey = { id: 'key-1', account: { id: 'account-1' } };

    expect(getRequiredApiKey(contextWith(apiKey))).toBe(apiKey);
  });

  it('throws when the route is not behind apiKeyAuth', () => {
    expect(() => getRequiredApiKey(contextWith(undefined))).toThrow(/apiKeyAuth\(\) middleware/);
  });
});
