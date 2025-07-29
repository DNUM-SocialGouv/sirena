import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { endCron, getLastCron, startCron } from './crons.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    crons: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('crons.service', () => {
  const mockCron = {
    id: '1',
    name: 'fetch-data',
    state: 'started',
    startedAt: new Date('2023-01-01T00:00:00Z'),
    endedAt: null,
    params: { date: '2023-01-01' },
    result: null,
    createdAt: new Date('2023-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLastCron()', () => {
    it('should return the latest cron for a given name', async () => {
      vi.mocked(prisma.crons.findFirst).mockResolvedValueOnce(mockCron);

      const result = await getLastCron('fetch-data');

      expect(prisma.crons.findFirst).toHaveBeenCalledWith({
        where: { name: 'fetch-data', state: 'finished' },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(mockCron);
    });
  });

  describe('startCron()', () => {
    it('should create a new started cron', async () => {
      const now = new Date();
      const params = { date: '2023-01-01' };
      vi.mocked(prisma.crons.create).mockResolvedValueOnce(mockCron);

      const result = await startCron({
        name: 'fetch-data',
        startedAt: now,
        params,
      });

      expect(prisma.crons.create).toHaveBeenCalledWith({
        data: {
          name: 'fetch-data',
          state: 'started',
          startedAt: now,
          params,
        },
      });

      expect(result).toEqual(mockCron);
    });
  });

  describe('endCron()', () => {
    it('should update cron with result and end state', async () => {
      const endedAt = new Date();
      const result = { status: 'ok' };

      await endCron({
        id: '1',
        state: 'success',
        result,
        endedAt,
      });

      expect(prisma.crons.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          result,
          state: 'success',
          endedAt,
        },
      });
    });
  });
});
