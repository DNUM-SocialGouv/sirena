import type { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLastCron } from '@/crons/crons.service';
import { importRequetes } from '@/features/dematSocial/dematSocial.service';
import { withCronLifecycle } from '@/jobs/jobs.utils';
import { abortControllerStorage } from '@/libs/asyncLocalStorage';
import { fetchRequests } from './fetchRequests';

vi.mock('@/crons/crons.service', () => ({
  getLastCron: vi.fn(),
}));

vi.mock('@/jobs/jobs.utils', () => ({
  withCronLifecycle: vi.fn(),
}));

vi.mock('@/features/dematSocial/dematSocial.service', () => ({
  importRequetes: vi.fn(),
}));

vi.mock('@/libs/asyncLocalStorage', () => ({
  abortControllerStorage: {
    run: vi.fn(),
  },
}));

describe('fetchRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call getLastCron, run importRequetes in context, and clear timeout', async () => {
    const cronDate = new Date(2000, 1, 1, 13);
    vi.setSystemTime(cronDate);
    const resultData = { count: 1 };

    const mockJob = {
      name: 'fetch-requests',
      id: 'job-123',
      data: {
        timeoutMs: 5000,
      },
    } as unknown as Job;

    const lastCron = {
      params: null,
      name: 'fetch-requests',
      result: null,
      id: '1',
      createdAt: new Date(),
      state: 'started',
      startedAt: new Date(),
      endedAt: null,
    };

    vi.mocked(getLastCron).mockResolvedValueOnce(lastCron);

    vi.mocked(abortControllerStorage.run).mockImplementationOnce(async (_, fn) => await fn());

    vi.mocked(importRequetes).mockResolvedValueOnce(resultData);

    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => await fn(mockJob));

    await fetchRequests(mockJob);

    expect(getLastCron).toHaveBeenCalledWith('fetch-requests');

    expect(withCronLifecycle).toHaveBeenCalledWith(mockJob, { date: cronDate }, expect.any(Function));

    expect(abortControllerStorage.run).toHaveBeenCalledWith(expect.any(AbortController), expect.any(Function));

    expect(importRequetes).toHaveBeenCalledWith(cronDate);

    expect(() => vi.runOnlyPendingTimers()).not.toThrow();
  });

  it('should abort if importRequetes takes too long', async () => {
    const cronDate = new Date(2000, 1, 1, 13);
    vi.setSystemTime(cronDate);

    const mockJob = {
      name: 'fetch-requests',
      id: 'job-456',
      data: {
        timeoutMs: 2000,
      },
    } as unknown as Job;

    const lastCron = {
      params: null,
      name: 'fetch-requests',
      result: null,
      id: '1',
      createdAt: new Date(),
      state: 'started',
      startedAt: new Date(),
      endedAt: null,
    };

    vi.mocked(getLastCron).mockResolvedValueOnce(lastCron);

    let capturedController: AbortController;

    vi.mocked(abortControllerStorage.run).mockImplementationOnce(async (controller, _fn) => {
      capturedController = controller;
      return new Promise(() => {});
    });

    vi.mocked(withCronLifecycle).mockImplementationOnce(async (_job, _params, fn) => {
      return await fn(mockJob);
    });

    const promise = fetchRequests(mockJob);

    vi.advanceTimersByTime(5000);
    await vi.runOnlyPendingTimersAsync();

    await Promise.resolve();

    // biome-ignore lint/style/noNonNullAssertion: We expect the controller init by promise
    expect(capturedController!.signal.aborted).toBe(true);

    promise.catch(() => {});
  });
});
