import type { Context, MiddlewareHandler } from 'hono';
import { createFactory } from 'hono/factory';
import { pinoLogger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';
import { envVars } from '@/config/env';
import type { AppBindings as AuthAppBindings } from '@/helpers/factories/appWithAuth';
import type { AppBindings as LogsAppBindings } from '@/helpers/factories/appWithLogs';
import {
  enrichRequestContext,
  enrichUserContext,
  extractRequestContext,
  getLogLevelConfig,
} from '@/helpers/middleware';
import { createContextualLogger } from '@/helpers/pino';
import { loggerStorage } from '@/libs/asyncLocalStorage';

// Pino middleware provides logging and can access optional auth data
type PinoAppBindings = {
  Variables: LogsAppBindings['Variables'] & Partial<AuthAppBindings['Variables']>;
};

const factory = createFactory<PinoAppBindings>();

const createPinoConfig = (): pino.LoggerOptions => {
  const logConfig = getLogLevelConfig();

  return {
    level: logConfig.console,
    serializers: {
      err: pino.stdSerializers.err,
      req: (req: { method: string; url: string }) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res: { status: number }) => ({
        status: res.status,
      }),
    },
  };
};

const createPrettyConfig = (messageFormat: string): pretty.PrettyStream | undefined =>
  envVars.LOG_FORMAT === 'pretty'
    ? pretty({
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
        messageFormat,
      })
    : undefined;

const createPinoLogger = (messageFormat: string, reqIdGenerator: (c?: Context) => string) =>
  pinoLogger({
    pino: pino(createPinoConfig(), createPrettyConfig(messageFormat)),
    http: {
      reqId: reqIdGenerator,
    },
  });

const defaultFactory = createFactory<LogsAppBindings>();

const defaultPinoMiddleware = (): MiddlewareHandler<LogsAppBindings> => {
  const pinoMiddleware = createPinoLogger('[{requestId}] {req.method} {req.url} {res.statusCode}', () =>
    crypto.randomUUID(),
  );
  return defaultFactory.createMiddleware(pinoMiddleware);
};

export default defaultPinoMiddleware;

export const enhancedPinoMiddleware = (): MiddlewareHandler<PinoAppBindings> => {
  // Create base pino instance
  const basePino = pino(createPinoConfig(), createPrettyConfig('[{requestId}] {message}'));

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

      // Check if logger exists and has child method, fallback to base pino instance if not
      const effectiveLogger = !baseLogger || typeof baseLogger.child !== 'function' ? basePino : baseLogger;

      // Create contextual logger with enriched context
      const contextualLogger = createContextualLogger(effectiveLogger, enrichedRequestContext, userContext);

      // Store the contextual logger in asyncLocalStorage
      await loggerStorage.run(contextualLogger, async () => {
        // Set the logger in Hono context for backward compatibility
        c.set('logger', contextualLogger);

        // Set headers for tracing
        c.header('x-request-id', context.requestId);
        c.header('x-trace-id', context.traceId);

        await next();
      });
    });
  });
};
