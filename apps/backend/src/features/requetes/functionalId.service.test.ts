import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { determineSource, generateRequeteId } from './functionalId.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

describe('functionalId.service', () => {
  const mockTransaction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateRequeteId', () => {
    it('should generate ID with RS prefix for SIRENA source', async () => {
      const mockDate = new Date('2025-09-15');
      vi.setSystemTime(mockDate);

      const mockFindMany = vi.fn().mockResolvedValue([]);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          requete: {
            findMany: mockFindMany,
          },
        });
      });
      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      const result = await generateRequeteId('SIRENA');

      expect(result).toBe('RS-2025-09-1');
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          id: {
            startsWith: 'RS-2025-09-',
          },
        },
        select: {
          id: true,
        },
        orderBy: {
          id: 'desc',
        },
        take: 1,
      });
    });

    it('should generate ID with RD prefix for DEMAT_SOCIAL source', async () => {
      const mockDate = new Date('2024-11-20');
      vi.setSystemTime(mockDate);

      const mockFindMany = vi.fn().mockResolvedValue([{ id: 'RD-2024-11-119' }]);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          requete: {
            findMany: mockFindMany,
          },
        });
      });
      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      const result = await generateRequeteId('DEMAT_SOCIAL');

      expect(result).toBe('RD-2024-11-120');
    });

    it('should handle month with leading zero', async () => {
      const mockDate = new Date('2025-01-05');
      vi.setSystemTime(mockDate);

      const mockFindMany = vi.fn().mockResolvedValue([{ id: 'RS-2025-01-41' }]);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          requete: {
            findMany: mockFindMany,
          },
        });
      });
      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      const result = await generateRequeteId('SIRENA');

      expect(result).toBe('RS-2025-01-42');
    });

    it('should increment counter for multiple calls on same day', async () => {
      const mockDate = new Date('2025-09-15');
      vi.setSystemTime(mockDate);

      const mockFindMany = vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'RS-2025-09-1' }])
        .mockResolvedValueOnce([{ id: 'RS-2025-09-2' }]);

      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          requete: {
            findMany: mockFindMany,
          },
        });
      });
      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      const result1 = await generateRequeteId('SIRENA');
      const result2 = await generateRequeteId('SIRENA');
      const result3 = await generateRequeteId('SIRENA');

      expect(result1).toBe('RS-2025-09-1');
      expect(result2).toBe('RS-2025-09-2');
      expect(result3).toBe('RS-2025-09-3');
    });

    it('should have separate counters for different sources', async () => {
      const mockDate = new Date('2025-09-15');
      vi.setSystemTime(mockDate);

      const mockFindMany = vi
        .fn()
        .mockResolvedValueOnce([{ id: 'RS-2025-09-5' }])
        .mockResolvedValueOnce([{ id: 'RD-2025-09-3' }]);

      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          requete: {
            findMany: mockFindMany,
          },
        });
      });
      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      const result1 = await generateRequeteId('SIRENA');
      const result2 = await generateRequeteId('DEMAT_SOCIAL');

      expect(result1).toBe('RS-2025-09-6');
      expect(result2).toBe('RD-2025-09-4');
    });

    it('should reset counter on new day', async () => {
      const mockFindMany = vi
        .fn()
        .mockResolvedValueOnce([{ id: 'RS-2025-09-10' }])
        .mockResolvedValueOnce([]);

      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          requete: {
            findMany: mockFindMany,
          },
        });
      });
      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      // Day 1
      vi.setSystemTime(new Date('2025-09-15'));
      const result1 = await generateRequeteId('SIRENA');
      expect(result1).toBe('RS-2025-09-11');

      // Day 2 - counter should reset
      vi.setSystemTime(new Date('2025-09-16'));
      const result2 = await generateRequeteId('SIRENA');
      expect(result2).toBe('RS-2025-09-1');
    });

    it('should handle malformed IDs gracefully', async () => {
      const mockDate = new Date('2025-09-15');
      vi.setSystemTime(mockDate);

      const mockFindMany = vi.fn().mockResolvedValue([{ id: 'RS-2025-09-invalid' }]);
      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          requete: {
            findMany: mockFindMany,
          },
        });
      });
      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      const result = await generateRequeteId('SIRENA');

      expect(result).toBe('RS-2025-09-1');
    });
  });

  describe('determineSource', () => {
    it('should return DEMAT_SOCIAL when dematSocialId is present', () => {
      expect(determineSource(123)).toBe('DEMAT_SOCIAL');
      expect(determineSource(1)).toBe('DEMAT_SOCIAL');
    });

    it('should return SIRENA when dematSocialId is null or undefined', () => {
      expect(determineSource(null)).toBe('SIRENA');
      expect(determineSource(undefined)).toBe('SIRENA');
      expect(determineSource(0)).toBe('SIRENA'); // 0 is falsy
    });
  });
});
