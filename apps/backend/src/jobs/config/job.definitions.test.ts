import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  envVars: {
    CRON_DEMAT_SOCIAL: '60',
    CRON_RETRY_AFFECTATION: '60',
    CRON_RETRY_IMPORT_REQUETES: '60',
    CRON_QUEUE_UNPROCESSED_FILES: '60',
    CRON_FILE_INTEGRITY_CHECK: '60',
    CRON_PURGE_ACCESS_LOGS: '60',
    ACCESS_LOG_RETENTION_DAYS: 365,
  },
}));

vi.mock('../tasks/fetchRequetes.task.js', () => ({
  fetchRequetes: vi.fn(),
}));

vi.mock('../tasks/retryAffectation.task.js', () => ({
  retryAffectation: vi.fn(),
}));

vi.mock('../tasks/retryImportRequetes.task.js', () => ({
  retryImportRequetes: vi.fn(),
}));

vi.mock('../tasks/queueUnprocessedFiles.task.js', () => ({
  queueUnprocessedFiles: vi.fn(),
}));

vi.mock('../tasks/purgeAccessLogs.task.js', () => ({
  purgeAccessLogs: vi.fn(),
}));

describe('job.definitions', () => {
  describe('handlerMap', () => {
    it('should resolve the right handler for each job', async () => {
      const { jobHandlers } = await import('./job.definitions.js');
      const handlerMap = Object.fromEntries(jobHandlers.map((j) => [j.name, j.task]));
      for (const job of jobHandlers) {
        expect(handlerMap[job.name]).toBe(job.task);
      }
    });
  });
});
