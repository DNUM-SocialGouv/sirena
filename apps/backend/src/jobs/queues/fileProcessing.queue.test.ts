import { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addFileProcessingJob } from './fileProcessing.queue.js';

// In-memory stand-in for the BullMQ queue: jobs are keyed by their jobId, and
// adding a job whose jobId already exists is a no-op, as in BullMQ.
const { jobs } = vi.hoisted(() => {
  type FakeJob = { name: string; data: unknown; state: string; remove: () => Promise<void> };
  return { jobs: new Map<string, FakeJob>() };
});

vi.mock('../../config/redis.js', () => ({ connection: {} }));

vi.mock('bullmq', () => ({
  Queue: vi.fn(function MockQueue() {
    const createJob = (id: string, name: string, data: unknown, state: string) => ({
      name,
      data,
      state,
      getState: async () => jobs.get(id)?.state,
      remove: vi.fn(async () => {
        jobs.delete(id);
      }),
    });
    return {
      getJob: vi.fn(async (id: string) => jobs.get(id)),
      add: vi.fn(async (name: string, data: unknown, { jobId }: { jobId: string }) => {
        if (!jobs.has(jobId)) jobs.set(jobId, createJob(jobId, name, data, 'waiting'));
        return jobs.get(jobId);
      }),
      seed: (id: string, state: string) => jobs.set(id, createJob(id, 'process-file', { previous: true }, state)),
    };
  }),
}));

const queue = vi.mocked(Queue).mock.results[0].value as { seed: (id: string, state: string) => void };

const file = { fileId: 'f1', fileName: 'scan.pdf', filePath: 'uploads/scan.pdf', mimeType: 'application/pdf' };

describe('fileProcessing.queue.ts', () => {
  beforeEach(() => {
    jobs.clear();
  });

  it('retries a failing file a bounded number of times, with an exponential backoff', () => {
    expect(Queue).toHaveBeenCalledWith(
      'file-processing',
      expect.objectContaining({
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }),
      }),
    );
  });

  it('queues one processing job per file, keyed by the file id', async () => {
    await expect(addFileProcessingJob(file)).resolves.toBe(true);

    expect([...jobs.keys()]).toEqual(['file-f1']);
    expect(jobs.get('file-f1')).toMatchObject({ name: 'process-file', data: file, state: 'waiting' });
  });

  it.each(['waiting', 'delayed', 'active'])('does not queue the file again while its job is %s', async (state) => {
    queue.seed('file-f1', state);

    await expect(addFileProcessingJob(file)).resolves.toBe(false);

    expect(jobs.size).toBe(1);
    expect(jobs.get('file-f1')).toMatchObject({ data: { previous: true }, state });
  });

  it.each(['completed', 'failed'])('queues the file again once its previous job has %s', async (state) => {
    queue.seed('file-f1', state);

    await expect(addFileProcessingJob(file)).resolves.toBe(true);

    expect(jobs.size).toBe(1);
    expect(jobs.get('file-f1')).toMatchObject({ data: file, state: 'waiting' });
  });
});
