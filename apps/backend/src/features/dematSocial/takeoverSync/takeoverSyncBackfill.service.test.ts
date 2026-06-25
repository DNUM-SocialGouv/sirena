import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/prisma.js';
import { syncRequetePriseEnChargeToDematSocial } from './takeoverSync.service.js';
import { backfillRequetesPrisesEnChargeToDematSocial } from './takeoverSyncBackfill.service.js';

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

vi.mock('./takeoverSync.service.js', () => ({
  syncRequetePriseEnChargeToDematSocial: vi.fn(),
}));

describe('backfillRequetesPrisesEnChargeToDematSocial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs taken-over Requêtes and continues after per-Requête failures', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce([
      { id: 'requete-1' },
      { id: 'requete-2' },
      { id: 'requete-3' },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);
    vi.mocked(syncRequetePriseEnChargeToDematSocial)
      .mockResolvedValueOnce({ kind: 'synced' })
      .mockRejectedValueOnce(new Error('demat.social unavailable'))
      .mockResolvedValueOnce({ kind: 'skipped', reason: 'DIFFERENT_FINAL_STATE' });

    const result = await backfillRequetesPrisesEnChargeToDematSocial();

    expect(prisma.requete.findMany).toHaveBeenCalledWith({
      where: {
        dematSocialId: { not: null },
        requeteEntites: {
          some: { statutId: { in: [REQUETE_STATUT_TYPES.EN_COURS, REQUETE_STATUT_TYPES.CLOTUREE] } },
        },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    expect(syncRequetePriseEnChargeToDematSocial).toHaveBeenNthCalledWith(1, 'requete-1');
    expect(syncRequetePriseEnChargeToDematSocial).toHaveBeenNthCalledWith(2, 'requete-2');
    expect(syncRequetePriseEnChargeToDematSocial).toHaveBeenNthCalledWith(3, 'requete-3');
    expect(result).toEqual({ found: 3, synchronised: 1, skipped: 1, failed: 1 });
    expect(logger.info).toHaveBeenCalledWith({ found: 3 }, expect.stringContaining('taken-over Requête backfill'));
    expect(logger.info).toHaveBeenCalledWith(result, expect.stringContaining('taken-over Requête backfill'));
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ requeteId: 'requete-2' }),
      expect.stringContaining('taken-over Requête backfill'),
    );
  });
});
