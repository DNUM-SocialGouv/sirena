import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma, type Requete, type RequeteEntite, type RequeteEtape } from '@/libs/prisma';
import { getRequeteEntiteById, getRequetesEntite, hasAccessToRequete } from './requetesEntite.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    requeteEntite: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const mockRequeteEntite: RequeteEntite & { requete: Requete } & { requeteEtape: RequeteEtape[] } = {
  requeteId: 'req123',
  entiteId: 'ent123',
  requete: {
    id: 'req123',
    dematSocialId: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
    commentaire: 'Commentaire',
    receptionDate: new Date(),
    receptionTypeId: 'receptionTypeId',
  },
  requeteEtape: [
    {
      id: 'etape1',
      statutId: 'A_QUALIFIER',
      createdAt: new Date(),
      updatedAt: new Date(),
      entiteId: 'ent123',
      estPartagee: false,
      nom: 'Etape 1',
      requeteId: 'req123',
    },
  ],
};

const mockedRequeteEntite = vi.mocked(prisma.requeteEntite);

describe('requetesEntite.service', () => {
  describe('getRequetesEntite', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch requetesEntite with default sort and pagination', async () => {
      mockedRequeteEntite.findMany.mockResolvedValueOnce([mockRequeteEntite]);
      mockedRequeteEntite.count.mockResolvedValueOnce(1);

      const result = await getRequetesEntite(null, {});

      expect(mockedRequeteEntite.findMany).toHaveBeenCalledWith({
        skip: 0,
        orderBy: { requeteId: 'desc' },
        include: {
          requete: true,
          requeteEtape: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(mockedRequeteEntite.count).toHaveBeenCalled();
      expect(result).toEqual({ data: [mockRequeteEntite], total: 1 });
    });

    it('should respect offset, limit, sort and order', async () => {
      mockedRequeteEntite.findMany.mockResolvedValueOnce([mockRequeteEntite]);
      mockedRequeteEntite.count.mockResolvedValueOnce(1);

      const result = await getRequetesEntite(null, {
        offset: 10,
        limit: 5,
        sort: 'entiteId',
        order: 'asc',
      });

      expect(mockedRequeteEntite.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        orderBy: { entiteId: 'asc' },
        include: {
          requete: true,
          requeteEtape: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(result.total).toBe(1);
    });
  });

  describe('hasAccessToRequete', () => {
    it('should return true if requeteEntite exists for given id and entiteIds', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      const result = await hasAccessToRequete({
        requeteId: mockRequeteEntite.requeteId,
        entiteId: mockRequeteEntite.entiteId,
      });
      expect(result).toBe(true);
    });

    it('should return false if requeteEntite does not exist for given id', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(null);
      const result = await hasAccessToRequete({
        requeteId: mockRequeteEntite.requeteId,
        entiteId: mockRequeteEntite.entiteId,
      });
      expect(result).toBe(false);
    });
  });

  describe('getRequeteEntiteById', () => {
    it('should fetch requeteEntite by id with related data', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);

      const result = await getRequeteEntiteById({
        requeteId: mockRequeteEntite.requeteId,
        entiteId: mockRequeteEntite.entiteId,
      });

      expect(prisma.requeteEntite.findUnique).toHaveBeenCalledWith({
        where: { requeteId_entiteId: { requeteId: mockRequeteEntite.requeteId, entiteId: mockRequeteEntite.entiteId } },
        include: {
          requete: true,
          requeteEtape: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(result).toEqual(mockRequeteEntite);
    });
  });
});
