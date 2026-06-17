import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/prisma.js';
import { syncClosedRequeteToDematSocial } from './closureSync.service.js';
import { backfillClosedRequetesToDematSocial } from './closureSyncBackfill.service.js';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => logger),
}));

vi.mock('../../../libs/prisma.js', () => ({
  prisma: {
    requete: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('./closureSync.service.js', () => ({
  syncClosedRequeteToDematSocial: vi.fn(),
}));

describe('backfillClosedRequetesToDematSocial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs all fully closed linked Requêtes and continues after per-Requête failures', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce([
      { id: 'requete-1' },
      { id: 'requete-2' },
      { id: 'requete-3' },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);
    vi.mocked(syncClosedRequeteToDematSocial)
      .mockResolvedValueOnce({ kind: 'synced' })
      .mockRejectedValueOnce(new Error('demat.social unavailable'))
      .mockResolvedValueOnce({ kind: 'skipped', reason: 'ALREADY_FINAL' });

    const result = await backfillClosedRequetesToDematSocial();

    expect(prisma.requete.findMany).toHaveBeenCalledWith({
      where: {
        dematSocialId: { not: null },
        requeteEntites: {
          some: {},
          every: { statutId: REQUETE_STATUT_TYPES.CLOTUREE },
        },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    expect(syncClosedRequeteToDematSocial).toHaveBeenNthCalledWith(1, 'requete-1');
    expect(syncClosedRequeteToDematSocial).toHaveBeenNthCalledWith(2, 'requete-2');
    expect(syncClosedRequeteToDematSocial).toHaveBeenNthCalledWith(3, 'requete-3');
    expect(result).toEqual({ found: 3, synchronised: 1, skipped: 1, failed: 1 });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ requeteId: 'requete-2' }),
      expect.stringContaining('backfill'),
    );
  });
});
