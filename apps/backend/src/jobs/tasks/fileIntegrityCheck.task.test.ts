import type { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordFileIntegrity } from '../../features/monitoring/metrics.worker.js';
import { runFileIntegrityCheck } from '../../features/uploadedFiles/fileIntegrity.service.js';
import { abortControllerStorage } from '../../libs/asyncLocalStorage.js';
import type { JobDataMap } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';
import { fileIntegrityCheck } from './fileIntegrityCheck.task.js';

vi.mock('../../features/uploadedFiles/fileIntegrity.service.js', () => ({
  runFileIntegrityCheck: vi.fn(),
}));

vi.mock('../../features/monitoring/metrics.worker.js', () => ({
  recordFileIntegrity: vi.fn(),
}));

vi.mock('../config/job.utils.js', () => ({
  withCronLifecycle: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../libs/asyncLocalStorage.js')>()),
  getLoggerStore: () => ({ warn: vi.fn() }),
}));

const TIMEOUT_MS = 60_000;
const job = {
  name: 'file-integrity-check',
  id: 'job-1',
  data: { timeoutMs: TIMEOUT_MS },
} as Job<JobDataMap['file-integrity-check']>;

const integrityResult = { checked: 10, missing: 1 };

describe('fileIntegrityCheck.task.ts', () => {
  let result: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    result = undefined;
    vi.mocked(withCronLifecycle).mockImplementation((async (_job: Job, _params: unknown, fn: (j: Job) => unknown) => {
      result = await fn(job);
      return result;
    }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the integrity check, records its metrics and returns its result', async () => {
    vi.mocked(runFileIntegrityCheck).mockResolvedValue(integrityResult as never);

    await fileIntegrityCheck(job);

    expect(withCronLifecycle).toHaveBeenCalledWith(job, { timeoutMs: TIMEOUT_MS }, expect.any(Function));
    expect(recordFileIntegrity).toHaveBeenCalledWith(integrityResult);
    expect(result).toEqual(integrityResult);
  });

  it('aborts the check once the job timeout is reached', async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(runFileIntegrityCheck).mockImplementation((async () => {
      signal = abortControllerStorage.getStore()?.signal;
      await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
      return integrityResult;
    }) as never);

    await fileIntegrityCheck(job);

    expect(signal?.aborted).toBe(true);
  });

  it('clears the timeout when the check ends in time', async () => {
    vi.mocked(runFileIntegrityCheck).mockResolvedValue(integrityResult as never);

    await fileIntegrityCheck(job);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timeout when the check fails', async () => {
    vi.mocked(runFileIntegrityCheck).mockRejectedValue(new Error('S3 down'));

    await expect(fileIntegrityCheck(job)).rejects.toThrow('S3 down');

    expect(vi.getTimerCount()).toBe(0);
    expect(recordFileIntegrity).not.toHaveBeenCalled();
  });
});
