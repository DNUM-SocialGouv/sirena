import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { getRequetesEntite } from './requetesEntite.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    requeteEntite: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const mockRequeteEntite = {
  id: 'rqe1',
  number: 42,
  createdAt: new Date(),
  updatedAt: new Date(),
  requeteId: 'req123',
  requete: {
    id: 'req123',
    number: 99,
    dematSocialId: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  requetesEntiteStates: [
    {
      id: 'state1',
      statutId: 'A_QUALIFIER',
      createdAt: new Date(),
      updatedAt: new Date(),
      requeteEntiteId: 'rqe1',
    },
  ],
};

const mockedRequeteEntite = vi.mocked(prisma.requeteEntite);

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
      orderBy: { createdAt: 'asc' },
      include: {
        requete: true,
        requetesEntiteStates: {
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
      sort: 'updatedAt',
      order: 'desc',
    });

    expect(mockedRequeteEntite.findMany).toHaveBeenCalledWith({
      skip: 10,
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        requete: true,
        requetesEntiteStates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    expect(result.total).toBe(1);
  });
});
