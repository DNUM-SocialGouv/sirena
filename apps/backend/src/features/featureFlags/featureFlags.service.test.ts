import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { getEntiteChain } from '../entites/entites.service.js';
import { hasFeature, resolvePublicFeatureFlags } from './featureFlags.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    featureFlag: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../entites/entites.service.js', () => ({
  getEntiteChain: vi.fn(),
}));

describe('hasFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEntiteChain).mockResolvedValue([]);
  });

  it('returns the supplied false default when the flag is absent', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce(null);

    await expect(hasFeature('SHARED_PROCESSING_STEPS', false, 'reader@example.test', 'reader-child')).resolves.toBe(
      false,
    );
  });

  it('enables the flag for a targeted user independently of the global value', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce({
      enabled: false,
      userEmails: ['author@example.test'],
      entiteIds: [],
    } as never);

    await expect(hasFeature('SHARED_PROCESSING_STEPS', false, 'author@example.test', 'author-entite')).resolves.toBe(
      true,
    );
  });

  it('enables the flag when a parent entity in the user chain is targeted', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce({
      enabled: false,
      userEmails: [],
      entiteIds: ['root-entite'],
    } as never);
    vi.mocked(getEntiteChain).mockResolvedValueOnce([{ id: 'child-entite' }, { id: 'root-entite' }] as never);

    await expect(hasFeature('SHARED_PROCESSING_STEPS', false, 'reader@example.test', 'child-entite')).resolves.toBe(
      true,
    );
  });

  it('keeps a non-targeted reader disabled', async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValueOnce({
      enabled: true,
      userEmails: ['author@example.test'],
      entiteIds: ['author-entite'],
    } as never);
    vi.mocked(getEntiteChain).mockResolvedValueOnce([{ id: 'reader-entite' }] as never);

    await expect(hasFeature('SHARED_PROCESSING_STEPS', false, 'reader@example.test', 'reader-entite')).resolves.toBe(
      false,
    );
  });
});

describe('resolvePublicFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports a public flag as disabled when it does not exist yet', async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValueOnce([] as never);

    await expect(resolvePublicFeatureFlags()).resolves.toEqual({ WARNING_BANNER: false });
  });

  it('exposes the global value of a public flag', async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValueOnce([
      { name: 'WARNING_BANNER', enabled: true, userEmails: [], entiteIds: [] },
    ] as never);

    await expect(resolvePublicFeatureFlags()).resolves.toEqual({ WARNING_BANNER: true });
  });

  it('keeps a targeted flag off, since a signed out visitor matches no target', async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValueOnce([
      { name: 'WARNING_BANNER', enabled: true, userEmails: ['author@example.test'], entiteIds: [] },
    ] as never);

    await expect(resolvePublicFeatureFlags()).resolves.toEqual({ WARNING_BANNER: false });
  });

  it('queries the allowlisted flags only', async () => {
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValueOnce([] as never);

    await resolvePublicFeatureFlags();

    expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({ where: { name: { in: ['WARNING_BANNER'] } } });
  });
});
