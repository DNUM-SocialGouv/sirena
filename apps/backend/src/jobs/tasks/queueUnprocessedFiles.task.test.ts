import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordFileQueueDepth } from '../../features/monitoring/metrics.worker.js';
import { getFileQueueDepth, getUnprocessedFiles } from '../../features/uploadedFiles/uploadedFiles.service.js';
import type { JobDataMap } from '../config/job.types.js';
import { withCronLifecycle } from '../config/job.utils.js';
import { addFileProcessingJob } from '../queues/fileProcessing.queue.js';
import { queueUnprocessedFiles } from './queueUnprocessedFiles.task.js';

vi.mock('../../features/uploadedFiles/uploadedFiles.service.js', () => ({
  getUnprocessedFiles: vi.fn(),
  getFileQueueDepth: vi.fn(),
}));

vi.mock('../../features/monitoring/metrics.worker.js', () => ({
  recordFileQueueDepth: vi.fn(),
}));

vi.mock('../queues/fileProcessing.queue.js', () => ({
  addFileProcessingJob: vi.fn(),
}));

vi.mock('../config/job.utils.js', () => ({
  withCronLifecycle: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => ({ info: vi.fn(), debug: vi.fn() }),
}));

const job = { name: 'queue-unprocessed-files', id: 'job-1', data: {} } as Job<JobDataMap['queue-unprocessed-files']>;

const file = (id: string) => ({
  id,
  fileName: `${id}.pdf`,
  filePath: `uploads/${id}.pdf`,
  mimeType: 'application/pdf',
});

describe('queueUnprocessedFiles.task.ts', () => {
  let result: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    result = undefined;
    vi.mocked(getFileQueueDepth).mockResolvedValue({ pending: 3, stuck: 1 });
    vi.mocked(withCronLifecycle).mockImplementation((async (_job: Job, _params: unknown, fn: (j: Job) => unknown) => {
      result = await fn(job);
      return result;
    }) as never);
  });

  it('records the queue depth even when there is nothing to queue', async () => {
    vi.mocked(getUnprocessedFiles).mockResolvedValue([]);

    await queueUnprocessedFiles(job);

    expect(recordFileQueueDepth).toHaveBeenCalledWith(3, 1);
    expect(addFileProcessingJob).not.toHaveBeenCalled();
    expect(result).toEqual({ queuedCount: 0, skippedCount: 0 });
  });

  it('queues a processing job for each unprocessed file', async () => {
    vi.mocked(getUnprocessedFiles).mockResolvedValue([file('f1'), file('f2')] as never);
    vi.mocked(addFileProcessingJob).mockResolvedValue(true as never);

    await queueUnprocessedFiles(job);

    expect(addFileProcessingJob).toHaveBeenCalledTimes(2);
    expect(addFileProcessingJob).toHaveBeenCalledWith({
      fileId: 'f1',
      fileName: 'f1.pdf',
      filePath: 'uploads/f1.pdf',
      mimeType: 'application/pdf',
    });
    expect(result).toEqual({ queuedCount: 2, skippedCount: 0 });
  });

  it('counts as skipped the files whose job is already queued', async () => {
    vi.mocked(getUnprocessedFiles).mockResolvedValue([file('f1'), file('f2'), file('f3')] as never);
    vi.mocked(addFileProcessingJob)
      .mockResolvedValueOnce(true as never)
      .mockResolvedValueOnce(false as never)
      .mockResolvedValueOnce(false as never);

    await queueUnprocessedFiles(job);

    expect(result).toEqual({ queuedCount: 1, skippedCount: 2 });
  });
});
