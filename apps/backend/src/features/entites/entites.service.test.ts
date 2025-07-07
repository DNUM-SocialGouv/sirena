import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { getEntiteChain, getEntiteForUser, getEntites } from './entites.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    entite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('entites.service', () => {
  describe('getEntiteForUser()', () => {
    const mockEntite1 = {
      id: '2',
      label: 'b',
      email: 'test2@domain.fr',
      entiteTypeId: 'ENTITE_TYPE_A',
      entiteMereId: null,
      nomComplet: 'Entite B',
      organizationUnit: 'ARS-CORSE',
      emailDomain: null,
    };
    const mockEntite2 = {
      id: '1',
      label: 'A',
      email: 'test@domain.fr',
      entiteTypeId: 'ENTITE_TYPE_A',
      entiteMereId: null,
      nomComplet: 'Entite A',
      organizationUnit: '',
      emailDomain: 'domain.fr',
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return entite if organizationUnit matches a single entite', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValue([mockEntite1]);

      const result = await getEntiteForUser('ARS-CORSE', '');
      expect(prisma.entite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                organizationUnit: expect.stringContaining('ARS-CORSE'),
              }),
            ]),
          }),
        }),
      );
      expect(result).toEqual(mockEntite1);
    });

    it('should return entite if email domain matches a single entite', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite2]);

      const result = await getEntiteForUser(null, 'john@domain.fr');
      expect(prisma.entite.findMany).toHaveBeenLastCalledWith({ where: { emailDomain: 'domain.fr' } });
      expect(result).toEqual(mockEntite2);
    });

    it('should return null if multiple entites match orgUnit', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValue([mockEntite1, mockEntite2]);
      const result = await getEntiteForUser('DUPLICATE', '');
      expect(result).toBeNull();
    });

    it('should return null if no matches found', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValue([]);
      const result = await getEntiteForUser(null, 'nobody@nothing.com');
      expect(result).toBeNull();
    });
  });

  describe('getEntites(id)', () => {
    it('should fetch root entites when entiteMere is null', async () => {
      const mockEntite = {
        id: '2',
        label: 'b',
        email: 'test2@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: null,
        nomComplet: 'Entite B',
        organizationUnit: 'ARS-CORSE',
        emailDomain: null,
      };
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite]);
      vi.mocked(prisma.entite.count).mockResolvedValueOnce(1);

      const result = await getEntites(null, { sort: 'nomComplet', order: 'asc', offset: 0, search: '' });

      expect(prisma.entite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entiteMere: null,
            OR: undefined,
          },
          orderBy: { nomComplet: 'asc' },
          skip: 0,
        }),
      );
      expect(result).toEqual({
        data: [mockEntite],
        total: 1,
      });
    });

    it('should fetch children entites when entiteMere is an ID', async () => {
      const mockEntite = {
        id: '2',
        label: 'b',
        email: 'test2@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: '1',
        nomComplet: 'Entite B',
        organizationUnit: 'ARS-CORSE',
        emailDomain: null,
      };
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite]);
      vi.mocked(prisma.entite.count).mockResolvedValueOnce(1);

      const result = await getEntites('1', {
        sort: 'nomComplet',
        order: 'asc',
        offset: 0,
        limit: 1,
        search: 'test',
      });

      expect(prisma.entite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entiteMere: { is: { id: '1' } },
            OR: [
              { nomComplet: { contains: 'test', mode: 'insensitive' } },
              { label: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        }),
      );

      expect(result).toEqual({
        data: [mockEntite],
        total: 1,
      });
    });
  });
  describe('getEntiteChain()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
    it('should return full entite chain from child to root', async () => {
      const mockEntite1 = {
        id: '2',
        label: 'b',
        email: 'test2@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: null,
        nomComplet: 'Entite B',
        organizationUnit: 'ARS-CORSE',
        emailDomain: null,
      };
      const mockEntite2 = {
        id: '1',
        label: 'A',
        email: 'test@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: '2',
        nomComplet: 'Entite A',
        organizationUnit: '',
        emailDomain: 'domain.fr',
      };

      vi.mocked(prisma.entite.findUnique).mockResolvedValueOnce(mockEntite2).mockResolvedValueOnce(mockEntite1);

      const chain = await getEntiteChain('1');

      expect(chain[0].id).toBe('2');
      expect(chain[1].id).toBe('1');

      expect(prisma.entite.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.entite.findUnique).toHaveBeenCalledWith({ where: { id: '1' }, select: expect.anything() });
      expect(prisma.entite.findUnique).toHaveBeenCalledWith({ where: { id: '2' }, select: expect.anything() });
    });

    it('should return empty array if nothing found', async () => {
      vi.mocked(prisma.entite.findUnique).mockResolvedValueOnce(null);

      const result = await getEntiteChain('unknown-id');
      expect(result).toEqual([]);
      expect(prisma.entite.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
