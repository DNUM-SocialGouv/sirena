import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { getEntiteChain } from '../entites/entites.service.js';
import { hasFeature } from './featureFlags.service.js';

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
