import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import {
  getDematSocialMappingById,
  getDematSocialMappings,
  patchDematSocialMapping,
} from './dematSocialMapping.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    dematSocialMapping: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('dematSocialMapping.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDatum = {
    id: '1',
    key: 'abc',
    dematSocialId: 'ds1',
    label: 'Label A',
    comment: 'comment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getDematSocialMappings()', () => {
    it('should fetch mappings with pagination and search', async () => {
      const mockData = [mockDatum];

      vi.mocked(prisma.dematSocialMapping.findMany).mockResolvedValueOnce(mockData);
      vi.mocked(prisma.dematSocialMapping.count).mockResolvedValueOnce(1);

      const result = await getDematSocialMappings({
        sort: 'key',
        order: 'asc',
        offset: 0,
        limit: 10,
        search: 'abc',
      });

      expect(prisma.dematSocialMapping.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: {
            OR: [
              { dematSocialId: { contains: 'abc', mode: 'insensitive' } },
              { key: { contains: 'abc', mode: 'insensitive' } },
              { label: { contains: 'abc', mode: 'insensitive' } },
              { comment: { contains: 'abc', mode: 'insensitive' } },
            ],
          },
          orderBy: { key: 'asc' },
        }),
      );

      expect(result).toEqual({ data: mockData, total: 1 });
    });
  });

  describe('getDematSocialMappingById()', () => {
    it('should fetch mapping by ID', async () => {
      vi.mocked(prisma.dematSocialMapping.findUnique).mockResolvedValueOnce(mockDatum);

      const result = await getDematSocialMappingById('1');
      expect(prisma.dematSocialMapping.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockDatum);
    });
  });

  describe('patchDematSocialMapping()', () => {
    it('should update mapping by ID', async () => {
      const updateData = { label: 'Updated', comment: 'new comment', dematSocialId: 'ds2' };
      const mockUpdated = { ...mockDatum, ...updateData };

      vi.mocked(prisma.dematSocialMapping.update).mockResolvedValueOnce(mockUpdated);

      const result = await patchDematSocialMapping('1', updateData);
      expect(prisma.dematSocialMapping.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
      expect(result).toEqual(mockUpdated);
    });
  });
});
