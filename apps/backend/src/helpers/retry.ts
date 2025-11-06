import { getLoggerStore } from '@/libs/asyncLocalStorage';

export interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  context?: Record<string, unknown>;
}

/**
 * Retries an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, backoffMs = 100, shouldRetry, context = {} } = options;

  let lastError: unknown;
  let retriesLeft = maxRetries;

  while (retriesLeft > 0) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (retriesLeft === 1 || (shouldRetry && !shouldRetry(error))) {
        throw error;
      }

      const delay = backoffMs * (maxRetries - retriesLeft + 1);
      const logger = getLoggerStore();
      logger?.warn?.({ ...context, retriesLeft: retriesLeft - 1, delayMs: delay }, 'Operation failed, retrying...');

      await new Promise((resolve) => setTimeout(resolve, delay));
      retriesLeft--;
    }
  }

  throw lastError;
}

interface PrismaError {
  code?: string;
  meta?: {
    target?: string[];
  };
}

function isPrismaError(error: unknown): error is PrismaError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

/**
 * Check if error is a Prisma unique constraint violation
 */
export function isPrismaUniqueConstraintError(error: unknown, field?: string): boolean {
  if (!isPrismaError(error)) return false;
  if (error.code !== 'P2002') return false;

  if (field && error.meta?.target) {
    return error.meta.target.includes(field);
  }

  return true;
}
