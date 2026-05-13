/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequeteIdFromSirecId, saveFromSirec } from './sirecMigration.service.js';

vi.mock('@sirena/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    requete: { findFirst: vi.fn(), create: vi.fn() },
    lieuDeSurvenue: { create: vi.fn() },
    misEnCause: { create: vi.fn() },
    demarchesEngagees: { create: vi.fn() },
    situation: { create: vi.fn() },
    fait: { create: vi.fn() },
  },
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

describe('sirecMigration.service.ts', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import('@sirena/db')).prisma;
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
  });

  describe('getRequeteIdFromSirecId', () => {
    it('should return the requete id when found', async () => {
      vi.mocked(prisma.requete.findFirst).mockResolvedValueOnce({ id: 'SIREC-42' });

      const result = await getRequeteIdFromSirecId(42);

      expect(result).toBe('SIREC-42');
      expect(prisma.requete.findFirst).toHaveBeenCalledWith({
        where: { sirecId: 42 },
        select: { id: true },
      });
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.requete.findFirst).mockResolvedValueOnce(null);

      const result = await getRequeteIdFromSirecId(42);

      expect(result).toBeNull();
    });
  });

  describe('saveFromSirec', () => {
    const receptionDate = new Date('2024-01-15');
    const data = {
      sirenaId: 'SIREC-42',
      sirecId: 42,
      receptionDate,
      fait: { autresPrecisions: 'Ma réclamation' },
      situation: {},
    };

    beforeEach(() => {
      vi.mocked(prisma.requete.create).mockResolvedValue({ id: 'SIREC-42' } as any);
      vi.mocked(prisma.lieuDeSurvenue.create).mockResolvedValue({ id: 'lieu-1' } as any);
      vi.mocked(prisma.misEnCause.create).mockResolvedValue({ id: 'mec-1' } as any);
      vi.mocked(prisma.demarchesEngagees.create).mockResolvedValue({ id: 'dem-1' } as any);
      vi.mocked(prisma.situation.create).mockResolvedValue({ id: 'sit-1' } as any);
      vi.mocked(prisma.fait.create).mockResolvedValue({} as any);
    });

    it('should return the requete id', async () => {
      const result = await saveFromSirec(data);

      expect(result).toBe('SIREC-42');
    });

    it('should create Requete with correct data', async () => {
      await saveFromSirec(data);

      expect(prisma.requete.create).toHaveBeenCalledWith({
        data: { id: 'SIREC-42', sirecId: 42, receptionDate },
        select: { id: true },
      });
    });

    it('should create LieuDeSurvenue, MisEnCause and DemarchesEngagees with empty data', async () => {
      await saveFromSirec(data);

      expect(prisma.lieuDeSurvenue.create).toHaveBeenCalledWith({ data: {}, select: { id: true } });
      expect(prisma.misEnCause.create).toHaveBeenCalledWith({ data: {}, select: { id: true } });
      expect(prisma.demarchesEngagees.create).toHaveBeenCalledWith({ data: {}, select: { id: true } });
    });

    it('should create Situation linking sub-entities to the Requete', async () => {
      await saveFromSirec(data);

      expect(prisma.situation.create).toHaveBeenCalledWith({
        data: {
          lieuDeSurvenueId: 'lieu-1',
          misEnCauseId: 'mec-1',
          demarchesEngageesId: 'dem-1',
          requeteId: 'SIREC-42',
        },
        select: { id: true },
      });
    });

    it('should create Fait with autresPrecisions from faitData', async () => {
      await saveFromSirec(data);

      expect(prisma.fait.create).toHaveBeenCalledWith({
        data: { situationId: 'sit-1', autresPrecisions: 'Ma réclamation' },
      });
    });

    it('should wrap all creates in a single transaction', async () => {
      await saveFromSirec(data);

      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });
  });
});
