import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeatureFlagsController from './featureFlags.controller.js';
import { resolvePublicFeatureFlags } from './featureFlags.service.js';

vi.mock('./featureFlags.service.js', () => ({
  createFeatureFlag: vi.fn(),
  deleteFeatureFlag: vi.fn(),
  getFeatureFlagById: vi.fn(),
  getFeatureFlags: vi.fn(),
  patchFeatureFlag: vi.fn(),
  resolveFeatureFlags: vi.fn(),
  resolvePublicFeatureFlags: vi.fn(),
}));

const client = testClient(FeatureFlagsController);

describe('GET /feature-flags/public', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers a request that carries no authentication', async () => {
    vi.mocked(resolvePublicFeatureFlags).mockResolvedValueOnce({ WARNING_BANNER: true });

    const res = await client.public.$get();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { WARNING_BANNER: true } });
  });
});
