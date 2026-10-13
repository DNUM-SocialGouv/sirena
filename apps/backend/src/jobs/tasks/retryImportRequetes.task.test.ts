import * as Sentry from '@sentry/node';
import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importSingleDossier } from '../../features/dematSocial/dematSocial.service.js';
import { getUnresolvedFailures } from '../../features/dematSocial/dematSocialImportFailure.service.js';
import { getSentryStore } from '../../libs/asyncLocalStorage.js';
import type { JobDataMap } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';
import { retryImportRequetes } from './retryImportRequetes.task.js';

vi.mock('../../features/dematSocial/dematSocial.service.js', () => ({
  importSingleDossier: vi.fn(),
}));

vi.mock('../../features/dematSocial/dematSocialImportFailure.service.js', () => ({
  getUnresolvedFailures: vi.fn(),
}));

vi.mock('../config/job.utils.js', () => ({
  withCronLifecycle: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  getSentryStore: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

const job = {
  name: 'retry-import-requetes',
  id: 'job-1',
  data: { batchSize: 10 },
} as Job<JobDataMap['retry-import-requetes']>;

const failure = (dematSocialId: number) => ({
  id: `failure-${dematSocialId}`,
  dematSocialId,
  retryCount: 2,
  errorType: 'IMPORT_ERROR',
});

describe('retryImportRequetes.task.ts', () => {
  let result: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    result = undefined;
    vi.mocked(getSentryStore).mockReturnValue(null as never);
    vi.mocked(withCronLifecycle).mockImplementation((async (_job: Job, _params: unknown, fn: (j: Job) => unknown) => {
      result = await fn(job);
      return result;
    }) as never);
  });

  it('retries the unresolved failures of the batch size', async () => {
    vi.mocked(getUnresolvedFailures).mockResolvedValue([] as never);

    await retryImportRequetes(job);

    expect(withCronLifecycle).toHaveBeenCalledWith(job, { batchSize: 10 }, expect.any(Function));
    expect(getUnresolvedFailures).toHaveBeenCalledWith(10);
    expect(importSingleDossier).not.toHaveBeenCalled();
    expect(result).toEqual({ successCount: 0, errorCount: 0, total: 0 });
  });

  it('counts each dossier as resolved or still failing', async () => {
    vi.mocked(getUnresolvedFailures).mockResolvedValue([failure(1), failure(2), failure(3)] as never);
    vi.mocked(importSingleDossier)
      .mockResolvedValueOnce({ success: true, requeteId: 'R1' } as never)
      .mockResolvedValueOnce({ success: false } as never)
      .mockResolvedValueOnce({ success: true, requeteId: null } as never);

    await retryImportRequetes(job);

    expect(importSingleDossier).toHaveBeenNthCalledWith(1, 1);
    expect(importSingleDossier).toHaveBeenNthCalledWith(2, 2);
    expect(importSingleDossier).toHaveBeenNthCalledWith(3, 3);
    expect(result).toEqual({ successCount: 1, errorCount: 2, total: 3 });
  });

  it('keeps retrying the next dossiers when one import throws, and reports it to Sentry', async () => {
    const error = new Error('Démat Social down');
    vi.mocked(getUnresolvedFailures).mockResolvedValue([failure(1), failure(2)] as never);
    vi.mocked(importSingleDossier)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ success: true, requeteId: 'R2' } as never);

    await retryImportRequetes(job);

    expect(result).toEqual({ successCount: 1, errorCount: 1, total: 2 });
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      contexts: {
        retryImportRequetes: {
          dematSocialId: 1,
          retryCount: 2,
          errorType: 'IMPORT_ERROR',
          failureId: 'failure-1',
          jobId: 'job-1',
        },
      },
    });
  });

  it('attaches the failure context to the job Sentry scope when there is one', async () => {
    const error = new Error('boom');
    const scope = { setContext: vi.fn() };
    vi.mocked(getSentryStore).mockReturnValue(scope as never);
    vi.mocked(getUnresolvedFailures).mockResolvedValue([failure(1)] as never);
    vi.mocked(importSingleDossier).mockRejectedValueOnce(error);

    await retryImportRequetes(job);

    expect(scope.setContext).toHaveBeenCalledWith('retryImportRequetes', expect.objectContaining({ dematSocialId: 1 }));
    expect(Sentry.captureException).toHaveBeenCalledWith(error, scope);
  });
});
