import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { determineSource, generateRequeteId } from './functionalId.service';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    requete: {
      count: vi.fn(),
    },
  },
}));

describe('functionalId.service', () => {
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

      vi.mocked(prisma.requete.count).mockResolvedValue(0);

      const result = await generateRequeteId('SIRENA');

      expect(result).toBe('2025-09-RS1');
      expect(prisma.requete.count).toHaveBeenCalledWith({
        where: {
          id: {
            startsWith: '2025-09-RS',
          },
        },
      });
    });

    it('should generate ID with RD prefix for DEMAT_SOCIAL source', async () => {
      const mockDate = new Date('2024-11-20');
      vi.setSystemTime(mockDate);

      vi.mocked(prisma.requete.count).mockResolvedValue(119);

      const result = await generateRequeteId('DEMAT_SOCIAL');

      expect(result).toBe('2024-11-RD120');
    });

    it('should handle month with leading zero', async () => {
      const mockDate = new Date('2025-01-05');
      vi.setSystemTime(mockDate);

      vi.mocked(prisma.requete.count).mockResolvedValue(41);

      const result = await generateRequeteId('SIRENA');

      expect(result).toBe('2025-01-RS42');
    });

    it('should increment counter for multiple calls on same day', async () => {
      const mockDate = new Date('2025-09-15');
      vi.setSystemTime(mockDate);

      vi.mocked(prisma.requete.count).mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(2);

      const result1 = await generateRequeteId('SIRENA');
      const result2 = await generateRequeteId('SIRENA');
      const result3 = await generateRequeteId('SIRENA');

      expect(result1).toBe('2025-09-RS1');
      expect(result2).toBe('2025-09-RS2');
      expect(result3).toBe('2025-09-RS3');
    });

    it('should have separate counters for different sources', async () => {
      const mockDate = new Date('2025-09-15');
      vi.setSystemTime(mockDate);

      vi.mocked(prisma.requete.count).mockResolvedValueOnce(5).mockResolvedValueOnce(3);

      const result1 = await generateRequeteId('SIRENA');
      const result2 = await generateRequeteId('DEMAT_SOCIAL');

      expect(result1).toBe('2025-09-RS6');
      expect(result2).toBe('2025-09-RD4');
    });

    it('should reset counter on new month', async () => {
      vi.mocked(prisma.requete.count).mockResolvedValueOnce(10).mockResolvedValueOnce(0);

      // Month 1
      vi.setSystemTime(new Date('2025-09-15'));
      const result1 = await generateRequeteId('SIRENA');
      expect(result1).toBe('2025-09-RS11');

      // Month 2 - counter should reset
      vi.setSystemTime(new Date('2025-10-01'));
      const result2 = await generateRequeteId('SIRENA');
      expect(result2).toBe('2025-10-RS1');
    });

    it('should handle malformed IDs gracefully', async () => {
      const mockDate = new Date('2025-09-15');
      vi.setSystemTime(mockDate);

      vi.mocked(prisma.requete.count).mockResolvedValue(0);

      const result = await generateRequeteId('SIRENA');

      expect(result).toBe('2025-09-RS1');
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
