import { describe, expect, it, vi } from 'vitest';
import { jobHandlers } from './job.definitions';

vi.mock('@/config/env', () => ({
  envVars: {},
}));

describe('job.definitions', () => {
  describe('handlerMap', () => {
    it('should resolve the right handler for each job', () => {
      const handlerMap = Object.fromEntries(jobHandlers.map((j) => [j.name, j.task]));
      for (const job of jobHandlers) {
        expect(handlerMap[job.name]).toBe(job.task);
      }
    });
  });
});
