import { describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { checkHealth } from './health.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe('health.service', () => {
  describe('checkHealth()', () => {
    it('returns healthy when DB responds', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce(1);

      const result = await checkHealth();
      expect(result).toEqual({ healthy: true });
    });
  });
});
