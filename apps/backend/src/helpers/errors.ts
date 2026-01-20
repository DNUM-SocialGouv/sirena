import * as Sentry from '@sentry/node';
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { envVars } from '../config/env.js';
import { sentryStorage } from '../libs/asyncLocalStorage.js';
import type { AppBindings } from './factories/appWithLogs.js';

export const isHTTPException = (err: unknown): err is HTTPException => {
  const errObj = err as unknown as Record<string, unknown>;
  return (
    err instanceof HTTPException ||
    (err !== null && typeof errObj.getResponse === 'function' && typeof errObj.status === 'number')
  );
};

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  if (isHTTPException(err)) {
    return err.getResponse();
  }

  const logger = c.get('logger');
  if (logger) {
    logger.error({ err }, 'Internal server error');
  }

  if (envVars.SENTRY_ENABLED) {
    const sentryScope = sentryStorage.getStore();
    if (sentryScope) {
      // Use the isolated scope from asyncLocalStorage
      sentryScope.setTag('error_source', 'global_handler');
      Sentry.captureException(err, sentryScope);
    } else {
      // If not in scope context, create a new isolated scope
      Sentry.withScope((scope) => {
        scope.setTag('error_source', 'global_handler');
        Sentry.captureException(err, scope);
      });
    }
  }

  return c.json({ message: 'Internal server error' }, 500);
};

type SerializedError = {
  name?: string;
  message?: string;
  stack?: string;
  tag?: string;
  cause?: string;
  errors?: Array<{
    name?: string;
    message?: string;
    tag?: string;
    path?: unknown;
    extensions?: unknown;
    cause?: string;
  }>;
};

const SENSITIVE_KEYS = new Set([
  'headers',
  'authorization',
  'cookie',
  'token',
  'password',
  'secret',
  'apikey',
  'request',
  'response',
  'raw',
]);

/**
 * Sanitizes extensions object by filtering out sensitive fields (case-insensitive)
 */
function sanitizeExtensions(ext: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ext)) {
    if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Serializes an error into a JSON-safe object, extracting useful information
 * from Graffle/GraphQL errors (errors[], extensions, path, cause, etc.)
 * while avoiding sensitive data like headers or tokens.
 * This function never throws, even with malformed input.
 */
export const serializeError = (err: unknown): SerializedError => {
  if (!err || typeof err !== 'object') {
    return { message: String(err) };
  }

  const e = err as Record<string, unknown>;

  // Extract errors array (for Aggregate/Graffle errors)
  const errors = Array.isArray(e.errors)
    ? e.errors.map((x: unknown) => {
        if (!x || typeof x !== 'object') {
          return { message: String(x) };
        }
        const subErr = x as Record<string, unknown>;
        const cause =
          subErr.cause && typeof subErr.cause === 'object' && subErr.cause !== null && 'message' in subErr.cause
            ? String((subErr.cause as Record<string, unknown>).message)
            : undefined;
        return {
          name: typeof subErr.name === 'string' ? subErr.name : undefined,
          message: typeof subErr.message === 'string' ? subErr.message : undefined,
          tag: typeof subErr._tag === 'string' ? subErr._tag : undefined,
          path: subErr.path,
          // Sanitize extensions to avoid logging sensitive data
          extensions:
            subErr.extensions && typeof subErr.extensions === 'object' && subErr.extensions !== null
              ? sanitizeExtensions(subErr.extensions as Record<string, unknown>)
              : subErr.extensions,
          cause,
        };
      })
    : undefined;

  // Extract cause message
  const causeMessage =
    e.cause && typeof e.cause === 'object' && e.cause !== null && 'message' in e.cause
      ? String((e.cause as Record<string, unknown>).message)
      : undefined;

  return {
    name: typeof e.name === 'string' ? e.name : undefined,
    message: typeof e.message === 'string' ? e.message : undefined,
    stack: typeof e.stack === 'string' ? e.stack : undefined,
    tag: typeof e._tag === 'string' ? e._tag : undefined,
    cause: causeMessage,
    errors,
  };
};
