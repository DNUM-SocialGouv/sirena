import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { enrichRequestContext, enrichUserContext, extractRequestContext } from '@/helpers/middleware';
import type { AppBindings } from './factories/appWithLogs';

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  const logger = c.get('logger');
  logger.error({ err }, 'Internal server error');

  const sentry = c.get('sentry');
  if (sentry) {
    try {
      const requestContext = extractRequestContext(c);
      const userContext = enrichUserContext(requestContext);

      sentry.setContext('error_handler', {
        method: c.req.method,
        path: c.req.path,
        url: c.req.url,
      });

      if (userContext) {
        sentry.setUser({
          id: userContext.userId,
          ...(userContext.roleId && { role: userContext.roleId }),
          ...(userContext.entiteIds &&
            userContext.entiteIds.length > 0 && {
              entiteIds: userContext.entiteIds.join(','),
            }),
        });
      }

      sentry.setTag('error_source', 'global_handler');
      sentry.setTag('request_method', c.req.method);

      sentry.captureException(err);
    } catch (sentryError) {
      logger.error({ err: sentryError }, 'Failed to set Sentry context in error handler');
    }
  }

  return c.json({ message: 'Internal server error' }, 500);
};

type SerializedError = {
  message: string;
  stack?: string;
};

export const serializeError = (error: unknown): SerializedError => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  return { message: JSON.stringify(error), stack: undefined };
};

/**
 * Enhanced error capture utility using Hono Sentry integration
 * This provides a convenient way to capture exceptions with rich context
 * anywhere in the application.
 *
 * @param c - Hono Context
 * @param error - Error to capture
 * @param contextName - Name for the custom context (e.g., 'service_error', 'validation_error')
 * @param additionalContext - Additional context data to include
 */
export const captureExceptionWithContext = (
  c: any, // Context from Hono
  error: Error | unknown,
  contextName: string = 'application_error',
  additionalContext: Record<string, any> = {},
) => {
  const sentry = c.get('sentry');
  if (!sentry) {
    // Fallback to logging if Sentry is not available or not enabled
    const logger = c.get('logger');
    logger?.error({ err: error, context: additionalContext }, `Error in ${contextName}`);
    return;
  }

  try {
    // Extract current request context
    const requestContext = extractRequestContext(c);
    const _enrichedRequestContext = enrichRequestContext(requestContext);
    const userContext = enrichUserContext(requestContext);

    // Set custom context with additional data
    sentry.setContext(contextName, {
      source: 'manual_capture',
      timestamp: new Date().toISOString(),
      request_path: c.req.path,
      request_method: c.req.method,
      ...additionalContext,
    });

    // Set user context if available
    if (userContext) {
      sentry.setUser({
        id: userContext.userId,
        ...(userContext.roleId && { role: userContext.roleId }),
        ...(userContext.entiteIds &&
          userContext.entiteIds.length > 0 && {
            entiteIds: userContext.entiteIds.join(','),
          }),
      });

      sentry.setContext('business', {
        userId: userContext.userId,
        roleId: userContext.roleId,
        entiteIds: userContext.entiteIds,
      });
    }

    // Set tags for better filtering
    sentry.setTag('error_source', 'manual_capture');
    sentry.setTag('context_name', contextName);

    // Capture the exception
    if (error instanceof Error) {
      sentry.captureException(error);
    } else {
      sentry.captureMessage(`Non-Error exception in ${contextName}: ${String(error)}`);
    }
  } catch (sentryError) {
    // Fallback logging if Sentry context setting fails
    const logger = c.get('logger');
    logger?.error(
      { err: sentryError, originalError: error, context: additionalContext },
      `Failed to capture exception in Sentry for ${contextName}`,
    );
  }
};
