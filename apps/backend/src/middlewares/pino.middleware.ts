import type { Context, MiddlewareHandler } from 'hono';
import { createFactory } from 'hono/factory';
import { pinoLogger } from 'hono-pino';
import pino from 'pino';
import type { AppBindings as AuthAppBindings } from '../helpers/factories/appWithAuth.js';
import type { AppBindings as LogsAppBindings } from '../helpers/factories/appWithLogs.js';
import {
  createPinoContextData,
  enrichRequestContext,
  enrichUserContext,
  extractRequestContext,
} from '../helpers/middleware.js';
import { createPinoConfig, createPrettyConfig } from '../helpers/pino.js';
import { loggerStorage } from '../libs/asyncLocalStorage.js';

// Pino middleware provides logging and can access optional auth data
type PinoAppBindings = {
  Variables: LogsAppBindings['Variables'] & Partial<AuthAppBindings['Variables']>;
};

const factory = createFactory<PinoAppBindings>();

const defaultFactory = createFactory<LogsAppBindings>();

export const createPinoLogger = (messageFormat: string, reqIdGenerator: (c?: Context) => string) =>
  pinoLogger({
    pino: pino(createPinoConfig(), createPrettyConfig(messageFormat)),
    http: {
      reqId: reqIdGenerator,
    },
  });

const defaultPinoMiddleware = (): MiddlewareHandler<LogsAppBindings> => {
  const pinoMiddleware = createPinoLogger('[{requestId}] {req.method} {req.url} {res.statusCode}', () =>
    crypto.randomUUID(),
  );
  return defaultFactory.createMiddleware(pinoMiddleware);
};

export default defaultPinoMiddleware;

export const enhancedPinoMiddleware = (): MiddlewareHandler<PinoAppBindings> => {
  // Create base pino instance
  const basePino = pino(createPinoConfig(), createPrettyConfig('[{requestId}] {msg}'));

  const basePinoMiddleware = pinoLogger({
    pino: basePino,
    http: {
      reqId: (c?: Context) => c?.req.header('x-request-id') || crypto.randomUUID(),
    },
  });

  return factory.createMiddleware(async (c, next) => {
    return basePinoMiddleware(c, async () => {
      const context = extractRequestContext(c);
      const enrichedRequestContext = enrichRequestContext(context);
      const userContext = enrichUserContext(context);

      // Get the logger that was set by pinoLogger middleware
      const baseLogger = c.get('logger');

      const contextData = createPinoContextData(enrichedRequestContext, userContext);

      if (baseLogger) {
        baseLogger.assign(contextData);
      }

      const pinoInstance = baseLogger?._logger || basePino;

      await loggerStorage.run(pinoInstance, async () => {
        // Set headers for tracing
        c.header('x-request-id', context.requestId);
        c.header('x-trace-id', context.traceId);

        await next();
      });
    });
  });
};
