// Concurrency limit, timeout and circuit breaker for calls to an external dependency.

import { finished, type Readable } from 'node:stream';

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

export type StreamTimeouts = {
  /** Deadline for the dependency to hand the stream over. */
  handoffMs: number;
  /** Deadline for the body itself, counted from the handoff. */
  transferMs: number;
};

export type DependencyGuard = {
  /** Omitting `timeoutMs` leaves the call without any application-level deadline. */
  run: <T>(operation: string, fn: () => Promise<T>, timeoutMs?: number) => Promise<T>;
  /**
   * For an operation that resolves on the stream handoff, `getObject` typically: the slot, the
   * deadline and the recorded outcome cover the transfer, which is what holds a socket on the
   * dependency.
   */
  runStreaming: <T extends Readable>(operation: string, fn: () => Promise<T>, timeouts: StreamTimeouts) => Promise<T>;
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
  // Promise.resolve: a caller may return a bare value rather than a promise.
  const call = Promise.resolve(fn());

  // A fired timeout does not cancel the call: a late stream has no consumer left to close it.
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
  // One probe at a time while half-open: otherwise every concurrent caller retries a dead dependency.
  let probing = false;

  const record = (operation: string, outcome: DependencyCallOutcome, durationMs: number) => {
    onCall?.({ dependency: name, operation, outcome, durationMs });
  };

  // Throws when the circuit refuses the call, otherwise tells the caller whether it owns the
  // half-open probe. Claimed synchronously, so exactly one caller gets it.
  const enterCircuit = (operation: string): boolean => {
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

    return isProbe;
  };

  const onAnswered = () => {
    consecutiveFailures = 0;
    state = 'closed';
  };

  // Feeds a failure to the circuit and returns the outcome to report it under.
  const classify = (err: unknown): DependencyCallOutcome => {
    if (!isTransient(err)) {
      onAnswered();
      return 'business_error';
    }

    consecutiveFailures += 1;
    if (consecutiveFailures >= failureThreshold) {
      state = 'open';
      openedAt = now();
    }

    return 'failure';
  };

  const run = async <T>(operation: string, fn: () => Promise<T>, timeoutMs?: number): Promise<T> => {
    const isProbe = enterCircuit(operation);

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

      onAnswered();
      record(operation, 'success', now() - startedAt);

      return result;
    } catch (err) {
      record(operation, classify(err), now() - startedAt);

      throw err;
    } finally {
      if (isProbe) {
        probing = false;
      }
      release();
    }
  };

  const runStreaming = async <T extends Readable>(
    operation: string,
    fn: () => Promise<T>,
    { handoffMs, transferMs }: StreamTimeouts,
  ): Promise<T> => {
    const isProbe = enterCircuit(operation);

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
    let stream: T;

    try {
      stream = await withTimeout(name, operation, handoffMs, fn);
    } catch (err) {
      record(operation, classify(err), now() - startedAt);
      if (isProbe) {
        probing = false;
      }
      release();

      throw err;
    }

    // Handing the stream over is the verdict the probe waited for; the slot stays with the body.
    onAnswered();
    if (isProbe) {
      probing = false;
    }

    const timer = setTimeout(() => {
      stream.destroy(new DependencyTimeoutError(name, operation, transferMs));
    }, transferMs);
    timer.unref();

    // finished(), not on('close'): it also fires for a stream already closed on arrival.
    finished(stream, (err) => {
      clearTimeout(timer);
      record(operation, err ? classify(err) : 'success', now() - startedAt);
      release();
    });

    return stream;
  };

  return { run, runStreaming, getState: () => state };
};
