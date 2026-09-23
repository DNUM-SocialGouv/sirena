import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endCron, startCron } from './crons.service.js';
import { withCronTrace } from './cronTrace.js';

vi.mock('./crons.service.js', () => ({ startCron: vi.fn(), endCron: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  // biome-ignore lint/suspicious/noExplicitAny: seul l'id est lu par le helper
  vi.mocked(startCron).mockResolvedValue({ id: 'cron-1' } as any);
});

describe('withCronTrace', () => {
  it('should record the run with its parameters and return what the treatment produced', async () => {
    const result = await withCronTrace('sync-geo-referentiel', { dryRun: false }, async () => ({ created: 3 }));

    expect(result).toEqual({ created: 3 });
    expect(startCron).toHaveBeenCalledWith({
      name: 'sync-geo-referentiel',
      startedAt: expect.any(Date),
      params: { dryRun: false },
    });
    expect(endCron).toHaveBeenCalledWith({
      id: 'cron-1',
      endedAt: expect.any(Date),
      result: { created: 3 },
      state: 'success',
    });
  });

  it('should open the run before the treatment starts', async () => {
    await withCronTrace('sync-geo-referentiel', {}, async () => {
      expect(startCron).toHaveBeenCalledTimes(1);
      expect(endCron).not.toHaveBeenCalled();
      return {};
    });

    expect(endCron).toHaveBeenCalledTimes(1);
  });

  it('should record a failure and let it propagate', async () => {
    const failure = new Error('source indisponible');

    await expect(
      withCronTrace('sync-geo-referentiel', {}, async () => {
        throw failure;
      }),
    ).rejects.toThrow('source indisponible');

    expect(endCron).toHaveBeenCalledWith({
      id: 'cron-1',
      endedAt: expect.any(Date),
      result: expect.objectContaining({ message: 'source indisponible' }),
      state: 'error',
    });
  });
});
