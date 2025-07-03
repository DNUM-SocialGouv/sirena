import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import VersionController from './version.controller';

const client = testClient(VersionController);

vi.mock('@/config/version.constant', () => ({
  GIT_COMMIT: 'qwerty',
  APP_VERSION: '1.0.0',
}));

describe('GET /version', () => {
  it('returns app version', async () => {
    const res = await client.index.$get();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ version: '1.0.0@qwerty' }); // Or match APP_VERSION
  });
});
