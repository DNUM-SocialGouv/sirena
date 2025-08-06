import { describe, expect, it, vi } from 'vitest';
import { getRequestEntiteById } from '@/features/requetesEntite/requetesEntite.service';
import { prisma } from '@/libs/prisma';
import { addProcessingState, getRequeteStates } from './requeteStates.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    requeteState: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/features/requetesEntite/requetesEntite.service', () => ({
  getRequestEntiteById: vi.fn(),
}));

describe('requeteStates.service.ts', () => {
  describe('addProcessingState()', () => {
    it('should add a processing state to a RequeteEntite', async () => {
      vi.mocked(getRequestEntiteById).mockResolvedValueOnce({
        requete: null,
        requetesEntiteStates: [],
        number: 1,
        id: 'requeteEntiteId',
        requeteId: 'requeteId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.requeteState.create).mockResolvedValueOnce({
        id: '1',
        requeteEntiteId: 'requeteEntiteId',
        stepName: 'Processing Step',
        statutId: 'EN_COURS',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await addProcessingState('requeteEntiteId', {
        stepName: 'Processing Step',
      });

      expect(result).toEqual({
        id: '1',
        requeteEntiteId: 'requeteEntiteId',
        stepName: 'Processing Step',
        statutId: 'EN_COURS',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(prisma.requeteState.create).toHaveBeenCalledWith({
        data: {
          requeteEntiteId: 'requeteEntiteId',
          stepName: 'Processing Step',
          statutId: 'EN_COURS',
        },
      });
      vi.mocked(prisma.requeteState.create).mockRestore();
    });
    it('should return null if RequeteEntite does not exist', async () => {
      vi.mocked(getRequestEntiteById).mockResolvedValueOnce(null);

      const result = await addProcessingState('nonExistentRequeteEntiteId', {
        stepName: 'Processing Step',
      });

      expect(result).toBeNull();
      expect(prisma.requeteState.create).not.toHaveBeenCalled();
    });
  });

  describe('getRequeteStates()', () => {
    it('should retrieve RequeteStates for a given RequeteEntite', async () => {
      const mockStates = [
        {
          id: '1',
          requeteEntiteId: 'requeteEntiteId',
          stepName: 'Step 1',
          statutId: 'EN_COURS',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.requeteState.findMany).mockResolvedValueOnce(mockStates);
      vi.mocked(prisma.requeteState.count).mockResolvedValueOnce(mockStates.length);

      const result = await getRequeteStates('requeteEntiteId', { offset: 0, limit: 10 });

      expect(result.data).toEqual(mockStates);
      expect(result.total).toBe(mockStates.length);
      expect(prisma.requeteState.findMany).toHaveBeenCalledWith({
        where: { requeteEntiteId: 'requeteEntiteId', stepName: { not: null } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      vi.mocked(prisma.requeteState.findMany).mockRestore();
    });

    it('should retrieve RequeteStates for a given RequeteEntite with no limit', async () => {
      const mockStates = [
        {
          id: '1',
          requeteEntiteId: 'requeteEntiteId',
          stepName: 'Step 1',
          statutId: 'EN_COURS',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.requeteState.findMany).mockResolvedValueOnce(mockStates);
      vi.mocked(prisma.requeteState.count).mockResolvedValueOnce(mockStates.length);

      const result = await getRequeteStates('requeteEntiteId', { offset: 0 });

      expect(result.data).toEqual(mockStates);
      expect(result.total).toBe(mockStates.length);
      expect(prisma.requeteState.findMany).toHaveBeenCalledWith({
        where: { requeteEntiteId: 'requeteEntiteId', stepName: { not: null } },
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
