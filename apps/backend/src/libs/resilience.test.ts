import { PassThrough, Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  createDependencyGuard,
  type DependencyGuardOptions,
  DependencyTimeoutError,
  DependencyUnavailableError,
} from './resilience.js';

class TransientError extends Error {
  readonly transient = true;
}

const isTransient = (err: unknown) => err instanceof TransientError || err instanceof DependencyTimeoutError;

const createGuard = (overrides: Partial<DependencyGuardOptions> = {}) =>
  createDependencyGuard({
    name: 's3',
    maxConcurrent: 2,
    maxQueued: 8,
    queueTimeoutMs: 10_000,
    failureThreshold: 2,
    resetTimeoutMs: 1_000,
    isTransient,
    ...overrides,
  });

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

const STREAM_TIMEOUTS = { handoffMs: 10_000, transferMs: 600_000 };

const drain = async (stream: Readable) => {
  const closed = new Promise((resolve) => stream.on('close', resolve));
  stream.resume();
  await closed;
  await flush();
};

describe('resilience.ts', () => {
  describe('limite de concurrence', () => {
    it('ne laisse pas passer plus d_appels simultanés que la limite', async () => {
      const guard = createGuard({ maxConcurrent: 2 });
      const gates = [deferred<string>(), deferred<string>(), deferred<string>()];
      let started = 0;

      const [first, second, third] = gates;
      const calls = gates.map((gate) =>
        guard.run('putObject', () => {
          started += 1;
          return gate.promise;
        }),
      );

      await flush();
      expect(started).toBe(2);

      first.resolve('ok');
      await flush();
      expect(started).toBe(3);

      second.resolve('ok');
      third.resolve('ok');
      await expect(Promise.all(calls)).resolves.toEqual(['ok', 'ok', 'ok']);
    });

    it('refuse un appel plutôt que de laisser la file croître sans borne', async () => {
      const guard = createGuard({ maxConcurrent: 1, maxQueued: 1 });
      const held = deferred<string>();

      const running = guard.run('putObject', () => held.promise);
      const queued = guard.run('putObject', () => Promise.resolve('ok'));
      await flush();

      await expect(guard.run('putObject', () => Promise.resolve('ok'))).rejects.toMatchObject({
        code: 'DEPENDENCY_UNAVAILABLE',
      });

      held.resolve('ok');
      await expect(running).resolves.toBe('ok');
      await expect(queued).resolves.toBe('ok');
    });

    it('abandonne une attente de place trop longue', async () => {
      vi.useFakeTimers();
      const guard = createGuard({ maxConcurrent: 1, queueTimeoutMs: 5_000 });
      const held = deferred<string>();

      const running = guard.run('putObject', () => held.promise);
      const queued = guard.run('statObject', () => Promise.resolve('ok'));
      const assertion = expect(queued).rejects.toBeInstanceOf(DependencyTimeoutError);

      await vi.advanceTimersByTimeAsync(5_000);
      await assertion;

      held.resolve('ok');
      await expect(running).resolves.toBe('ok');
      vi.useRealTimers();
    });

    it('libère la place même quand l_appel échoue', async () => {
      const guard = createGuard({ maxConcurrent: 1 });

      await expect(guard.run('statObject', () => Promise.reject(new TransientError('boom')))).rejects.toThrow('boom');
      await expect(guard.run('statObject', () => Promise.resolve('ok'))).resolves.toBe('ok');
    });
  });

  describe('timeout', () => {
    it('rejette un appel qui dépasse le délai', async () => {
      vi.useFakeTimers();
      const guard = createGuard();
      const pending = deferred<string>();

      const call = guard.run('statObject', () => pending.promise, 5_000);
      const assertion = expect(call).rejects.toBeInstanceOf(DependencyTimeoutError);
      await vi.advanceTimersByTimeAsync(5_000);
      await assertion;

      vi.useRealTimers();
    });

    it('laisse passer un transfert long quand aucun délai n_est demandé', async () => {
      vi.useFakeTimers();
      const guard = createGuard();
      const pending = deferred<string>();

      const call = guard.run('putObject', () => pending.promise);
      await vi.advanceTimersByTimeAsync(600_000);
      pending.resolve('uploaded');

      await expect(call).resolves.toBe('uploaded');
      vi.useRealTimers();
    });
  });

  describe('disjoncteur', () => {
    it('s_ouvre après le seuil et échoue alors immédiatement, sans appeler la dépendance', async () => {
      const guard = createGuard({ failureThreshold: 2 });
      const call = vi.fn(() => Promise.reject(new TransientError('S3 down')));

      await expect(guard.run('putObject', call)).rejects.toThrow('S3 down');
      await expect(guard.run('putObject', call)).rejects.toThrow('S3 down');
      expect(guard.getState()).toBe('open');

      await expect(guard.run('putObject', call)).rejects.toBeInstanceOf(DependencyUnavailableError);
      expect(call).toHaveBeenCalledTimes(2);
    });

    it('ne s_ouvre pas sur une erreur métier, qui prouve que la dépendance répond', async () => {
      const guard = createGuard({ failureThreshold: 2 });
      const businessError = Object.assign(new Error('denied'), { code: 'AccessDenied' });

      await expect(guard.run('statObject', () => Promise.reject(businessError))).rejects.toThrow('denied');
      await expect(guard.run('statObject', () => Promise.reject(businessError))).rejects.toThrow('denied');

      expect(guard.getState()).toBe('closed');
    });

    it('laisse repasser une sonde après le délai de réarmement, et se referme si elle réussit', async () => {
      let clock = 0;
      const guard = createGuard({ failureThreshold: 1, resetTimeoutMs: 1_000, now: () => clock });

      await expect(guard.run('putObject', () => Promise.reject(new TransientError('down')))).rejects.toThrow('down');
      expect(guard.getState()).toBe('open');

      clock = 1_001;
      await expect(guard.run('putObject', () => Promise.resolve('ok'))).resolves.toBe('ok');
      expect(guard.getState()).toBe('closed');
    });

    it('ne laisse repasser qu_une seule sonde, pas tous les appelants concurrents', async () => {
      let clock = 0;
      const guard = createGuard({ failureThreshold: 1, resetTimeoutMs: 1_000, now: () => clock });
      const probe = deferred<string>();
      const call = vi.fn(() => probe.promise);

      await expect(guard.run('putObject', () => Promise.reject(new TransientError('down')))).rejects.toThrow('down');
      expect(guard.getState()).toBe('open');

      clock = 1_001;
      const sonde = guard.run('putObject', call);
      await flush();

      await expect(guard.run('putObject', call)).rejects.toBeInstanceOf(DependencyUnavailableError);
      await expect(guard.run('statObject', call)).rejects.toBeInstanceOf(DependencyUnavailableError);
      expect(call).toHaveBeenCalledTimes(1);

      probe.resolve('ok');
      await expect(sonde).resolves.toBe('ok');
      expect(guard.getState()).toBe('closed');
    });

    it('se réouvre si la sonde échoue à son tour', async () => {
      let clock = 0;
      const guard = createGuard({ failureThreshold: 1, resetTimeoutMs: 1_000, now: () => clock });

      await expect(guard.run('putObject', () => Promise.reject(new TransientError('down')))).rejects.toThrow('down');
      clock = 1_001;
      await expect(guard.run('putObject', () => Promise.reject(new TransientError('still down')))).rejects.toThrow(
        'still down',
      );

      expect(guard.getState()).toBe('open');
    });
  });

  describe('observabilité', () => {
    it('rapporte chaque appel avec son issue', async () => {
      const onCall = vi.fn();
      let clock = 0;
      const guard = createGuard({ failureThreshold: 1, onCall, now: () => clock });

      clock = 0;
      await guard.run('statObject', () => {
        clock = 42;
        return Promise.resolve('ok');
      });
      expect(onCall).toHaveBeenCalledWith({
        dependency: 's3',
        operation: 'statObject',
        outcome: 'success',
        durationMs: 42,
      });

      await expect(guard.run('putObject', () => Promise.reject(new TransientError('down')))).rejects.toThrow();
      expect(onCall).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'failure' }));

      await expect(guard.run('putObject', () => Promise.resolve('ok'))).rejects.toBeInstanceOf(
        DependencyUnavailableError,
      );
      expect(onCall).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'rejected', durationMs: 0 }));
    });

    it('distingue une erreur métier d_un succès et d_une panne', async () => {
      const onCall = vi.fn();
      const guard = createGuard({ onCall });
      const businessError = Object.assign(new Error('denied'), { code: 'AccessDenied' });

      await expect(guard.run('statObject', () => Promise.reject(businessError))).rejects.toThrow('denied');

      expect(onCall).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'business_error' }));
      expect(guard.getState()).toBe('closed');
    });
  });

  describe('timeout', () => {
    it('détruit un flux qui se résout après le délai', async () => {
      vi.useFakeTimers();
      const guard = createGuard();
      const late = deferred<{ destroy: () => void }>();
      const destroy = vi.fn();

      const call = guard.run('getObject', () => late.promise, 5_000);
      const assertion = expect(call).rejects.toBeInstanceOf(DependencyTimeoutError);
      await vi.advanceTimersByTimeAsync(5_000);
      await assertion;

      late.resolve({ destroy });
      await vi.advanceTimersByTimeAsync(0);

      expect(destroy).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
  describe('transfert en flux', () => {
    it('garde la place jusqu_à la fin du transfert, pas jusqu_à l_obtention du flux', async () => {
      const guard = createGuard({ maxConcurrent: 1 });
      const body = new PassThrough();

      const stream = await guard.runStreaming('getObject', async () => body, STREAM_TIMEOUTS);

      const next = vi.fn(() => Promise.resolve('ok'));
      const queued = guard.run('statObject', next);
      await flush();
      expect(next).not.toHaveBeenCalled();

      body.end('payload');
      await drain(stream);

      await expect(queued).resolves.toBe('ok');
    });

    it('détruit un transfert qui dépasse le délai', async () => {
      vi.useFakeTimers();
      const guard = createGuard();
      const body = new PassThrough();
      body.write('first chunk');

      const stream = await guard.runStreaming('getObject', async () => body, {
        handoffMs: 10_000,
        transferMs: 5_000,
      });
      let transferError: unknown;
      stream.on('error', (err) => {
        transferError = err;
      });

      await vi.advanceTimersByTimeAsync(5_000);

      expect(transferError).toBeInstanceOf(DependencyTimeoutError);
      expect(stream.destroyed).toBe(true);
      vi.useRealTimers();
    });

    it('abandonne une obtention de flux trop lente et libère la place', async () => {
      vi.useFakeTimers();
      const guard = createGuard({ maxConcurrent: 1 });
      const pending = deferred<Readable>();

      const call = guard.runStreaming('getObject', () => pending.promise, { handoffMs: 5_000, transferMs: 600_000 });
      const assertion = expect(call).rejects.toBeInstanceOf(DependencyTimeoutError);
      await vi.advanceTimersByTimeAsync(5_000);
      await assertion;

      await expect(guard.run('statObject', () => Promise.resolve('ok'))).resolves.toBe('ok');
      vi.useRealTimers();
    });

    // Recording the handoff as a success hid both the duration of the transfer and any failure
    // during it: the metrics reported on a download that may never have completed.
    it('ne rapporte l_appel qu_à la fin du transfert', async () => {
      const onCall = vi.fn();
      const guard = createGuard({ onCall });
      const body = new PassThrough();

      const stream = await guard.runStreaming('getObject', async () => body, STREAM_TIMEOUTS);
      expect(onCall).not.toHaveBeenCalled();

      body.end('payload');
      await drain(stream);

      expect(onCall).toHaveBeenCalledWith(expect.objectContaining({ operation: 'getObject', outcome: 'success' }));
    });

    it('rapporte une panne survenue pendant la lecture du corps', async () => {
      const onCall = vi.fn();
      const guard = createGuard({ onCall, failureThreshold: 1 });
      const body = new PassThrough();

      const stream = await guard.runStreaming('getObject', async () => body, STREAM_TIMEOUTS);
      stream.on('error', () => {});
      body.destroy(new TransientError('connection reset mid-download'));
      await flush();
      await flush();

      expect(onCall).toHaveBeenCalledWith(expect.objectContaining({ operation: 'getObject', outcome: 'failure' }));
      expect(guard.getState()).toBe('open');
    });

    it('libère la place quand le corps échoue', async () => {
      const guard = createGuard({ maxConcurrent: 1 });
      const body = new PassThrough();

      const stream = await guard.runStreaming('getObject', async () => body, STREAM_TIMEOUTS);
      stream.on('error', () => {});
      body.destroy(new TransientError('connection reset mid-download'));
      await flush();
      await flush();

      await expect(guard.run('statObject', () => Promise.resolve('ok'))).resolves.toBe('ok');
    });

    it('rapporte l_appel même pour un flux déjà terminé à son arrivée', async () => {
      const onCall = vi.fn();
      const guard = createGuard({ onCall, maxConcurrent: 1 });
      const body = Readable.from([]);
      await drain(body);

      const stream = await guard.runStreaming('getObject', async () => body, STREAM_TIMEOUTS);
      await flush();
      await flush();

      expect(onCall).toHaveBeenCalledWith(expect.objectContaining({ operation: 'getObject' }));
      expect(stream).toBe(body);
      await expect(guard.run('statObject', () => Promise.resolve('ok'))).resolves.toBe('ok');
    });
  });
});
