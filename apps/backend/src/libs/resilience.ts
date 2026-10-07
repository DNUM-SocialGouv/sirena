/**
 * Concurrency limit, timeout and circuit breaker for calls to an external dependency. Without
 * them a provider outage lets the backend pile up doomed requests until the whole service goes
 * down, which is what happened on 2026-10-07. See docs/postmortem-2026-10-07.md.
 */

/** Only these may open a circuit and consume a retry budget; an invalid request may not. */
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'InternalError',
  'RequestTimeout',
  'ServiceUnavailable',
  'SlowDown',
  'DEPENDENCY_UNAVAILABLE',
]);

// minio wraps retried 5xx responses in a generic Error carrying no usable code.
const TRANSIENT_MESSAGE = /Retryable HTTP status: 5\d\d|Request failed after \d+ retr/;

const hasStringCode = (err: Error): err is Error & { code: string } => 'code' in err && typeof err.code === 'string';

// `seen` bounds the walk: a cyclic `cause` chain would otherwise overflow the stack.
const isTransient = (err: unknown, seen: Set<unknown>): boolean => {
  if (!(err instanceof Error) || seen.has(err)) {
    return false;
  }
  seen.add(err);

  if (hasStringCode(err) && TRANSIENT_ERROR_CODES.has(err.code)) {
    return true;
  }

  if (TRANSIENT_MESSAGE.test(err.message)) {
    return true;
  }

  return isTransient(err.cause, seen);
};

export const isTransientDependencyError = (err: unknown): boolean => isTransient(err, new Set());

export class DependencyUnavailableError extends Error {
  readonly code = 'DEPENDENCY_UNAVAILABLE';

  constructor(
    readonly dependency: string,
    readonly operation: string,
  ) {
    super(`${dependency} is unavailable, circuit is open (operation: ${operation})`);
    this.name = 'DependencyUnavailableError';
  }
}

export class DependencyTimeoutError extends Error {
  // ETIMEDOUT lets callers treat this like any ordinary network failure.
  readonly code = 'ETIMEDOUT';

  constructor(
    readonly dependency: string,
    readonly operation: string,
    timeoutMs: number,
  ) {
    super(`${dependency} did not answer within ${timeoutMs}ms (operation: ${operation})`);
    this.name = 'DependencyTimeoutError';
  }
}

export class DependencyOverloadedError extends Error {
  // Transient on purpose: the dependency is saturated, so retrying makes sense.
  readonly code = 'DEPENDENCY_UNAVAILABLE';

  constructor(
    readonly dependency: string,
    readonly operation: string,
    maxQueued: number,
  ) {
    super(`${dependency} has ${maxQueued} calls already queued (operation: ${operation})`);
    this.name = 'DependencyOverloadedError';
  }
}

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * `business_error` is distinct from `failure`: a business error proves the dependency answers, so
 * counting it as either a failure or a success would skew its error rate.
 */
export type DependencyCallOutcome = 'success' | 'failure' | 'business_error' | 'rejected';

export type DependencyCallRecorder = (call: {
  dependency: string;
  operation: string;
  outcome: DependencyCallOutcome;
  durationMs: number;
}) => void;

export type DependencyGuardOptions = {
  name: string;
  maxConcurrent: number;
  /** Queued calls past which a new call fails instead of piling up. */
  maxQueued: number;
  /** How long a call waits for a slot before giving up, independent of the operation timeout. */
  queueTimeoutMs: number;
  /** Consecutive transient failures before the circuit opens. */
  failureThreshold: number;
  /** How long calls fail immediately before a new probe is allowed through. */
  resetTimeoutMs: number;
  /** Only transient errors open the circuit: a business error is not an outage. */
  isTransient: (err: unknown) => boolean;
  onCall?: DependencyCallRecorder;
  now?: () => number;
};

export type DependencyGuard = {
  /** Omitting `timeoutMs` leaves the call without any application-level deadline. */
  run: <T>(operation: string, fn: () => Promise<T>, timeoutMs?: number) => Promise<T>;
  getState: () => CircuitState;
};

const isDestroyable = (value: unknown): value is { destroy: () => void } =>
  typeof value === 'object' && value !== null && 'destroy' in value && typeof value.destroy === 'function';

const withTimeout = async <T>(
  dependency: string,
  operation: string,
  timeoutMs: number,
  fn: () => Promise<T>,
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  let timedOut = false;
  // Promise.resolve: a caller may return a bare value, which Promise.race used to accept.
  const call = Promise.resolve(fn());

  // A fired timeout does not cancel the underlying operation: if it resolves anyway its result
  // has no consumer left, and a stream left as-is would keep its socket open.
  void call.then(
    (value) => {
      if (timedOut && isDestroyable(value)) {
        value.destroy();
      }
    },
    () => {},
  );

  try {
    return await Promise.race([
      call,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new DependencyTimeoutError(dependency, operation, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export const createDependencyGuard = (options: DependencyGuardOptions): DependencyGuard => {
  const {
    name,
    maxConcurrent,
    maxQueued,
    queueTimeoutMs,
    failureThreshold,
    resetTimeoutMs,
    isTransient,
    onCall,
    now = Date.now,
  } = options;

  let active = 0;
  const waiting: { grant: () => void }[] = [];

  // Bounded queue and bounded wait: otherwise a dependency that hangs instead of failing holds
  // every slot and callers pile up without end — the very outage this guard must prevent.
  const acquire = (operation: string): Promise<void> => {
    if (active < maxConcurrent) {
      active += 1;
      return Promise.resolve();
    }

    if (waiting.length >= maxQueued) {
      return Promise.reject(new DependencyOverloadedError(name, operation, maxQueued));
    }

    return new Promise<void>((resolve, reject) => {
      const entry = {
        grant: () => {
          clearTimeout(timer);
          active += 1;
          resolve();
        },
      };

      const timer = setTimeout(() => {
        const index = waiting.indexOf(entry);
        if (index !== -1) {
          waiting.splice(index, 1);
        }
        reject(new DependencyTimeoutError(name, operation, queueTimeoutMs));
      }, queueTimeoutMs);
      timer.unref();

      waiting.push(entry);
    });
  };

  const release = () => {
    active -= 1;
    waiting.shift()?.grant();
  };

  let state: CircuitState = 'closed';
  let consecutiveFailures = 0;
  let openedAt = 0;
  // One probe at a time while half-open: without this latch every concurrent caller would go
  // back out to a dependency that may still be down.
  let probing = false;

  const record = (operation: string, outcome: DependencyCallOutcome, durationMs: number) => {
    onCall?.({ dependency: name, operation, outcome, durationMs });
  };

  const run = async <T>(operation: string, fn: () => Promise<T>, timeoutMs?: number): Promise<T> => {
    // The probe is claimed in this synchronous block, so `isProbe` is true only for the caller
    // that took it; every other one is rejected until it has settled.
    let isProbe = false;
    if (state === 'open' && now() - openedAt >= resetTimeoutMs && !probing) {
      state = 'half-open';
      probing = true;
      isProbe = true;
    }

    if (state === 'open' || (state === 'half-open' && !isProbe)) {
      record(operation, 'rejected', 0);
      throw new DependencyUnavailableError(name, operation);
    }

    try {
      await acquire(operation);
    } catch (err) {
      if (isProbe) {
        probing = false;
      }
      record(operation, 'rejected', 0);
      throw err;
    }

    const startedAt = now();

    try {
      const result = timeoutMs === undefined ? await fn() : await withTimeout(name, operation, timeoutMs, fn);

      consecutiveFailures = 0;
      state = 'closed';
      record(operation, 'success', now() - startedAt);

      return result;
    } catch (err) {
      if (!isTransient(err)) {
        // A business error proves the dependency answers, so the circuit may close. It keeps its
        // own outcome, which would otherwise pollute the dependency's error rate.
        consecutiveFailures = 0;
        state = 'closed';
        record(operation, 'business_error', now() - startedAt);
        throw err;
      }

      consecutiveFailures += 1;
      if (consecutiveFailures >= failureThreshold) {
        state = 'open';
        openedAt = now();
      }
      record(operation, 'failure', now() - startedAt);

      throw err;
    } finally {
      if (isProbe) {
        probing = false;
      }
      release();
    }
  };

  return { run, getState: () => state };
};
