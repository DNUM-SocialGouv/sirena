/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequeteIdFromSirecId, saveRequeteFromSirec } from './sirecMigration.service.js';

vi.mock('@sirena/db', () => ({
  prisma: {
    requete: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('sirecMigration.service.ts', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import('@sirena/db')).prisma;
  });

  describe('getRequeteIdFromSirecId', () => {
    it('should return the requete id when found', async () => {
      vi.mocked(prisma.requete.findFirst).mockResolvedValueOnce({ id: '2024-01-RS1' });

      const result = await getRequeteIdFromSirecId(42);

      expect(result).toBe('2024-01-RS1');
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

  describe('saveRequeteFromSirec', () => {
    const receptionDate = new Date('2024-01-15');
    const data = { sirenaId: 'SIREC-42', sirecId: 42, receptionDate };

    it('should create a Requete and return its id', async () => {
      vi.mocked(prisma.requete.create).mockResolvedValueOnce({ id: 'SIREC-42' } as any);

      const result = await saveRequeteFromSirec(data);

      expect(result).toBe('SIREC-42');
      expect(prisma.requete.create).toHaveBeenCalledWith({
        data: {
          id: 'SIREC-42',
          sirecId: 42,
          receptionDate,
        },
        select: { id: true },
      });
    });

    it('should pass null receptionDate when not provided', async () => {
      vi.mocked(prisma.requete.create).mockResolvedValueOnce({ id: 'SIREC-99' } as any);

      await saveRequeteFromSirec({ sirenaId: 'SIREC-99', sirecId: 99, receptionDate: null });

      expect(prisma.requete.create).toHaveBeenCalledWith({
        data: {
          id: 'SIREC-99',
          sirecId: 99,
          receptionDate: null,
        },
        select: { id: true },
      });
    });
  });
});
