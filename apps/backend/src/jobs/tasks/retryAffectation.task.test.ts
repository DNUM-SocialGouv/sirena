/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import * as Sentry from '@sentry/node';
import type { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assignEntitesToRequeteTask } from '../../features/dematSocial/affectation/affectation.js';
import { prisma } from '../../libs/prisma.js';
import { withCronLifecycle } from '../config/job.utils.js';
import { retryAffectation } from './retryAffectation.task.js';

vi.mock('../../features/dematSocial/affectation/affectation.js', () => ({
  assignEntitesToRequeteTask: vi.fn(),
}));

vi.mock('../config/job.utils.js', () => ({
  withCronLifecycle: vi.fn(),
}));

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    requete: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
  getSentryStore: () => ({
    setContext: vi.fn(),
  }),
}));

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

describe('retryAffectation.task.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should find requetes without RequeteEntite and assign entities to them', async () => {
    const mockRequetes = [
      { id: 'requete-1', dematSocialId: 12345 },
      { id: 'requete-2', dematSocialId: 12346 },
      { id: 'requete-3', dematSocialId: null },
    ];

    const mockJob = {
      name: 'retry-affectation',
      id: 'job-123',
      data: {
        batchSize: 100,
      },
    } as unknown as Job;

    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce(mockRequetes as any);
    vi.mocked(assignEntitesToRequeteTask).mockResolvedValue(undefined);
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => await fn({} as Job));

    await retryAffectation(mockJob);

    expect(prisma.requete.findMany).toHaveBeenCalledWith({
      where: {
        requeteEntites: {
          none: {},
        },
      },
      select: {
        id: true,
        dematSocialId: true,
      },
      take: 100,
    });

    expect(assignEntitesToRequeteTask).toHaveBeenCalledTimes(3);
    expect(assignEntitesToRequeteTask).toHaveBeenCalledWith('12345');
    expect(assignEntitesToRequeteTask).toHaveBeenCalledWith('12346');
    expect(assignEntitesToRequeteTask).toHaveBeenCalledWith('requete-3');
  });

  it('should continue processing even if one assignment fails', async () => {
    const mockRequetes = [
      { id: 'requete-1', dematSocialId: 12345 },
      { id: 'requete-2', dematSocialId: 12346 },
      { id: 'requete-3', dematSocialId: 12347 },
    ];

    const mockJob = {
      name: 'retry-affectation',
      id: 'job-123',
      data: {
        batchSize: 100,
      },
    } as unknown as Job;

    const error = new Error('Assignment failed');

    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce(mockRequetes as any);
    vi.mocked(assignEntitesToRequeteTask)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => await fn({} as Job));

    await retryAffectation(mockJob);

    expect(assignEntitesToRequeteTask).toHaveBeenCalledTimes(3);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
  });

  it('should return correct statistics', async () => {
    const mockRequetes = [
      { id: 'requete-1', dematSocialId: 12345 },
      { id: 'requete-2', dematSocialId: 12346 },
    ];

    const mockJob = {
      name: 'retry-affectation',
      id: 'job-123',
      data: {
        batchSize: 100,
      },
    } as unknown as Job;

    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce(mockRequetes as any);
    vi.mocked(assignEntitesToRequeteTask).mockResolvedValue(undefined);
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => {
      const result = await fn({} as Job);
      expect(result).toEqual({
        successCount: 2,
        errorCount: 0,
        total: 2,
      });
      return result;
    });

    await retryAffectation(mockJob);
  });

  it('should handle empty result when no requetes need affectation', async () => {
    const mockJob = {
      name: 'retry-affectation',
      id: 'job-123',
      data: {
        batchSize: 100,
      },
    } as unknown as Job;

    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce([]);
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => {
      const result = await fn({} as Job);
      expect(result).toEqual({
        successCount: 0,
        errorCount: 0,
        total: 0,
      });
      return result;
    });

    await retryAffectation(mockJob);

    expect(assignEntitesToRequeteTask).not.toHaveBeenCalled();
  });

  it('should use requete id when dematSocialId is null', async () => {
    const mockRequetes = [{ id: 'requete-1', dematSocialId: null }];

    const mockJob = {
      name: 'retry-affectation',
      id: 'job-123',
      data: {
        batchSize: 100,
      },
    } as unknown as Job;

    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce(mockRequetes as any);
    vi.mocked(assignEntitesToRequeteTask).mockResolvedValue(undefined);
    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => await fn({} as Job));

    await retryAffectation(mockJob);

    expect(assignEntitesToRequeteTask).toHaveBeenCalledWith('requete-1');
  });
});
