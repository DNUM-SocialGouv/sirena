import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import {
  countUnresolvedFailuresByType,
  createImportFailure,
  getFailedDossierNumbers,
  getUnresolvedFailures,
  type ImportFailureErrorType,
  type ImportFailureResult,
  markFailureAsResolved,
} from './dematSocialImportFailure.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    dematSocialImportFailure: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

const mockedPrisma = vi.mocked(prisma.dematSocialImportFailure);

const mockFailure = {
  id: 'failure-1',
  dematSocialId: 300000,
  errorType: 'TECHNICAL' as ImportFailureErrorType,
  errorMessage: 'Test error message',
  errorContext: { test: true },
  retryCount: 0,
  lastRetryAt: null,
  resolvedAt: null,
  resolvedRequeteId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('dematSocialImportFailure.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createImportFailure()', () => {
    it('should create a new failure when it does not exist', async () => {
      const input = {
        dematSocialId: 300000,
        errorType: 'TECHNICAL' as ImportFailureErrorType,
        errorMessage: 'Test error',
        errorContext: { test: true },
      };

      mockedPrisma.upsert.mockResolvedValueOnce({
        ...mockFailure,
        errorContext: input.errorContext,
      });

      const result = await createImportFailure(input);

      expect(mockedPrisma.upsert).toHaveBeenCalledWith({
        where: { dematSocialId: input.dematSocialId },
        create: {
          dematSocialId: input.dematSocialId,
          errorType: input.errorType,
          errorMessage: input.errorMessage,
          errorContext: input.errorContext,
          retryCount: 0,
        },
        update: {
          errorType: input.errorType,
          errorMessage: input.errorMessage,
          errorContext: input.errorContext,
          retryCount: { increment: 1 },
          lastRetryAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual({
        ...mockFailure,
        errorContext: input.errorContext,
      });
    });

    it('should update existing failure and increment retryCount', async () => {
      const input = {
        dematSocialId: 300000,
        errorType: 'FUNCTIONAL' as ImportFailureErrorType,
        errorMessage: 'Updated error',
        errorContext: { updated: true },
      };

      const updatedFailure = {
        ...mockFailure,
        errorType: 'FUNCTIONAL' as ImportFailureErrorType,
        errorMessage: 'Updated error',
        errorContext: { updated: true },
        retryCount: 1,
        lastRetryAt: new Date(),
      };

      mockedPrisma.upsert.mockResolvedValueOnce(updatedFailure);

      const result = await createImportFailure(input);

      expect(mockedPrisma.upsert).toHaveBeenCalledWith({
        where: { dematSocialId: input.dematSocialId },
        create: {
          dematSocialId: input.dematSocialId,
          errorType: input.errorType,
          errorMessage: input.errorMessage,
          errorContext: input.errorContext,
          retryCount: 0,
        },
        update: {
          errorType: input.errorType,
          errorMessage: input.errorMessage,
          errorContext: input.errorContext,
          retryCount: { increment: 1 },
          lastRetryAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(result.retryCount).toBe(1);
      expect(result.lastRetryAt).toBeInstanceOf(Date);
    });

    it('should handle null errorContext', async () => {
      const input = {
        dematSocialId: 300000,
        errorType: 'UNKNOWN' as ImportFailureErrorType,
        errorMessage: 'Error without context',
        errorContext: null,
      };

      mockedPrisma.upsert.mockResolvedValueOnce({
        ...mockFailure,
        errorContext: null,
      });

      await createImportFailure(input);

      expect(mockedPrisma.upsert).toHaveBeenCalledWith({
        where: { dematSocialId: input.dematSocialId },
        create: {
          dematSocialId: input.dematSocialId,
          errorType: input.errorType,
          errorMessage: input.errorMessage,
          errorContext: undefined,
          retryCount: 0,
        },
        update: {
          errorType: input.errorType,
          errorMessage: input.errorMessage,
          errorContext: undefined,
          retryCount: { increment: 1 },
          lastRetryAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle undefined errorContext', async () => {
      const input = {
        dematSocialId: 300000,
        errorType: 'TECHNICAL' as ImportFailureErrorType,
        errorMessage: 'Error without context',
      };

      mockedPrisma.upsert.mockResolvedValueOnce(mockFailure);

      await createImportFailure(input);

      expect(mockedPrisma.upsert).toHaveBeenCalledWith({
        where: { dematSocialId: input.dematSocialId },
        create: {
          dematSocialId: input.dematSocialId,
          errorType: input.errorType,
          errorMessage: input.errorMessage,
          errorContext: undefined,
          retryCount: 0,
        },
        update: {
          errorType: input.errorType,
          errorMessage: input.errorMessage,
          errorContext: undefined,
          retryCount: { increment: 1 },
          lastRetryAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getUnresolvedFailures()', () => {
    it('should return unresolved failures with default batchSize', async () => {
      const failures = [mockFailure, { ...mockFailure, id: 'failure-2', dematSocialId: 300001 }];

      mockedPrisma.findMany.mockResolvedValueOnce(failures);

      const result = await getUnresolvedFailures();

      expect(mockedPrisma.findMany).toHaveBeenCalledWith({
        where: {
          resolvedAt: null,
        },
        orderBy: [{ retryCount: 'asc' }, { createdAt: 'asc' }],
        take: 10,
      });

      expect(result).toEqual(failures);
    });

    it('should return unresolved failures with custom batchSize', async () => {
      const failures = [mockFailure];

      mockedPrisma.findMany.mockResolvedValueOnce(failures);

      const result = await getUnresolvedFailures(5);

      expect(mockedPrisma.findMany).toHaveBeenCalledWith({
        where: {
          resolvedAt: null,
        },
        orderBy: [{ retryCount: 'asc' }, { createdAt: 'asc' }],
        take: 5,
      });

      expect(result).toEqual(failures);
    });

    it('should return empty array when no unresolved failures', async () => {
      mockedPrisma.findMany.mockResolvedValueOnce([]);

      const result = await getUnresolvedFailures();

      expect(result).toEqual([]);
    });

    it('should order by retryCount ascending then createdAt ascending', async () => {
      const failures = [
        { ...mockFailure, retryCount: 0, createdAt: new Date('2024-01-01') },
        { ...mockFailure, id: 'failure-2', retryCount: 0, createdAt: new Date('2024-01-02') },
        { ...mockFailure, id: 'failure-3', retryCount: 1, createdAt: new Date('2024-01-01') },
      ];

      mockedPrisma.findMany.mockResolvedValueOnce(failures);

      const result = await getUnresolvedFailures();

      expect(mockedPrisma.findMany).toHaveBeenCalledWith({
        where: {
          resolvedAt: null,
        },
        orderBy: [{ retryCount: 'asc' }, { createdAt: 'asc' }],
        take: 10,
      });

      expect(result).toEqual(failures);
    });
  });

  describe('markFailureAsResolved()', () => {
    it('should mark failure as resolved with requeteId', async () => {
      const dematSocialId = 300000;
      const resolvedRequeteId = 'requete-123';

      mockedPrisma.updateMany.mockResolvedValueOnce({ count: 1 });

      await markFailureAsResolved(dematSocialId, resolvedRequeteId);

      expect(mockedPrisma.updateMany).toHaveBeenCalledWith({
        where: {
          dematSocialId,
          resolvedAt: null,
        },
        data: {
          resolvedAt: expect.any(Date),
          resolvedRequeteId,
        },
      });
    });

    it('should only update unresolved failures', async () => {
      const dematSocialId = 300000;
      const resolvedRequeteId = 'requete-123';

      mockedPrisma.updateMany.mockResolvedValueOnce({ count: 1 });

      await markFailureAsResolved(dematSocialId, resolvedRequeteId);

      expect(mockedPrisma.updateMany).toHaveBeenCalledWith({
        where: {
          dematSocialId,
          resolvedAt: null,
        },
        data: {
          resolvedAt: expect.any(Date),
          resolvedRequeteId,
        },
      });
    });

    it('should handle case where no failure exists', async () => {
      const dematSocialId = 999999;
      const resolvedRequeteId = 'requete-123';

      mockedPrisma.updateMany.mockResolvedValueOnce({ count: 0 });

      await markFailureAsResolved(dematSocialId, resolvedRequeteId);

      expect(mockedPrisma.updateMany).toHaveBeenCalledWith({
        where: {
          dematSocialId,
          resolvedAt: null,
        },
        data: {
          resolvedAt: expect.any(Date),
          resolvedRequeteId,
        },
      });
    });
  });

  describe('countUnresolvedFailuresByType()', () => {
    it('should count unresolved failures by error type', async () => {
      const groupByResults = [
        { errorType: 'TECHNICAL' as ImportFailureErrorType, _count: { id: 5 } },
        { errorType: 'FUNCTIONAL' as ImportFailureErrorType, _count: { id: 3 } },
        { errorType: 'UNKNOWN' as ImportFailureErrorType, _count: { id: 2 } },
        // biome-ignore lint/suspicious/noExplicitAny: <test purposes>
      ] as any;

      mockedPrisma.groupBy.mockResolvedValueOnce(groupByResults);

      const result = await countUnresolvedFailuresByType();

      expect(mockedPrisma.groupBy).toHaveBeenCalledWith({
        by: ['errorType'],
        where: {
          resolvedAt: null,
        },
        _count: {
          id: true,
        },
      });

      expect(result).toEqual([
        { errorType: 'TECHNICAL', count: 5 },
        { errorType: 'FUNCTIONAL', count: 3 },
        { errorType: 'UNKNOWN', count: 2 },
      ]);
    });

    it('should return empty array when no unresolved failures', async () => {
      mockedPrisma.groupBy.mockResolvedValueOnce([]);

      const result = await countUnresolvedFailuresByType();

      expect(result).toEqual([]);
    });

    it('should handle single error type', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: <test purposes>
      const groupByResults = [{ errorType: 'TECHNICAL' as ImportFailureErrorType, _count: { id: 10 } }] as any;
      mockedPrisma.groupBy.mockResolvedValueOnce(groupByResults);

      const result = await countUnresolvedFailuresByType();

      expect(result).toEqual([{ errorType: 'TECHNICAL', count: 10 }]);
    });
  });

  describe('getFailedDossierNumbers()', () => {
    it('should return list of failed dossier numbers', async () => {
      const failures = [
        { dematSocialId: 300000 },
        { dematSocialId: 300001 },
        { dematSocialId: 300002 },
        // biome-ignore lint/suspicious/noExplicitAny: <test purposes>
      ] as any;

      mockedPrisma.findMany.mockResolvedValueOnce(failures);

      const result = await getFailedDossierNumbers();

      expect(mockedPrisma.findMany).toHaveBeenCalledWith({
        where: {
          resolvedAt: null,
        },
        select: {
          dematSocialId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual([300000, 300001, 300002]);
    });

    it('should return empty array when no failed dossiers', async () => {
      mockedPrisma.findMany.mockResolvedValueOnce([]);

      const result = await getFailedDossierNumbers();

      expect(result).toEqual([]);
    });

    it('should order by createdAt descending', async () => {
      const failures = [
        { dematSocialId: 300002 },
        { dematSocialId: 300001 },
        { dematSocialId: 300000 },
        // biome-ignore lint/suspicious/noExplicitAny: <test purposes>
      ] as any;

      mockedPrisma.findMany.mockResolvedValueOnce(failures);

      const result = await getFailedDossierNumbers();

      expect(mockedPrisma.findMany).toHaveBeenCalledWith({
        where: {
          resolvedAt: null,
        },
        select: {
          dematSocialId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual([300002, 300001, 300000]);
    });
  });
});
