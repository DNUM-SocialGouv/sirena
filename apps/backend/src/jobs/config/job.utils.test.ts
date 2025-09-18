import * as Sentry from '@sentry/node';
import type { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endCron, startCron } from '@/crons/crons.service';
import { serializeError } from '@/helpers/errors';
import { withCronLifecycle } from './job.utils';

vi.mock('@/crons/crons.service', () => ({
  startCron: vi.fn(),
  endCron: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/helpers/errors', () => ({
  serializeError: vi.fn((err) => ({ message: err.message })),
}));

const mockSentryScope = {
  setContext: vi.fn(),
};

vi.mock('@/libs/asyncLocalStorage', () => ({
  getSentryStore: vi.fn(() => mockSentryScope),
}));

const mockEnvVars = {
  SENTRY_ENABLED: false,
};

vi.mock('@/config/env', () => ({
  get envVars() {
    return mockEnvVars;
  },
}));

describe('job.utils', () => {
  describe('withCronLifecycle', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers();
      mockEnvVars.SENTRY_ENABLED = false;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle a successful job and call startCron + endCron with success', async () => {
      const date = new Date(2000, 1, 1, 13);
      vi.setSystemTime(date);

      const mockJob = {
        name: 'test-job',
        id: 'job-123',
      } as unknown as Job;

      const startedAt = new Date();
      const createdAt = new Date();

      const startedCron = {
        id: '1',
        name: 'test-job',
        startedAt,
        createdAt,
        params: {},
        result: {},
        endedAt: null,
        state: 'started',
      };

      vi.mocked(startCron).mockResolvedValueOnce(startedCron);

      const result = await withCronLifecycle(mockJob, { foo: 'bar' }, async () => {
        return { status: 'ok' };
      });

      expect(startCron).toHaveBeenCalledWith({
        name: 'test-job',
        startedAt,
        params: { foo: 'bar' },
      });

      expect(endCron).toHaveBeenCalledWith({
        id: '1',
        endedAt: new Date(),
        result: { status: 'ok' },
        state: 'success',
      });

      expect(result).toEqual({ status: 'ok' });
    });

    it('should handle a failing job, call endCron with error, and rethrow', async () => {
      const date = new Date(2000, 1, 1, 13);
      vi.setSystemTime(date);

      const mockJob = {
        name: 'test-job',
        id: 'job-123',
      } as unknown as Job;

      const startedAt = new Date();
      const createdAt = new Date();

      const startedCron = {
        id: '1',
        name: 'test-job',
        startedAt,
        createdAt,
        params: {},
        result: {},
        endedAt: null,
        state: 'started',
      };
      vi.mocked(startCron).mockResolvedValueOnce(startedCron);
      const error = new Error('Something went wrong');

      await expect(
        withCronLifecycle(mockJob, { foo: 'bar' }, async () => {
          throw error;
        }),
      ).rejects.toThrow(error);

      expect(serializeError).toHaveBeenCalledWith(error);

      expect(endCron).toHaveBeenCalledWith({
        id: '1',
        endedAt: new Date(),
        result: { message: 'Something went wrong' },
        state: 'error',
      });

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should send error to Sentry if enabled', async () => {
      const date = new Date(2000, 1, 1, 13);
      vi.setSystemTime(date);

      const mockJob = {
        name: 'test-job',
        id: 'job-123',
      } as unknown as Job;

      const startedAt = new Date();
      const createdAt = new Date();

      const startedCron = {
        id: '1',
        name: 'test-job',
        startedAt,
        createdAt,
        params: {},
        result: {},
        endedAt: null,
        state: 'started',
      };

      mockEnvVars.SENTRY_ENABLED = true;
      vi.mocked(startCron).mockResolvedValueOnce(startedCron);
      const error = new Error('Oops');

      await expect(
        withCronLifecycle(mockJob, {}, async () => {
          throw error;
        }),
      ).rejects.toThrow();

      expect(mockSentryScope.setContext).toHaveBeenCalledWith('job', {
        jobName: mockJob.name,
        jobId: mockJob.id,
        params: {},
        startedAt: startedAt.toISOString(),
        endedAt: new Date().toISOString(),
      });
      expect(Sentry.captureException).toHaveBeenCalledWith(error, mockSentryScope);
    });
  });
});
