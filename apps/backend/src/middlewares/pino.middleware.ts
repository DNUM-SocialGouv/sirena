import * as Sentry from '@sentry/node';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { pinoLogger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';
import { envVars } from '@/config/env';
import {
  extractRequestContext,
  getCaller,
  getLogExtraContext,
  getLogLevelConfig,
  type LogLevel,
  type LogLevelConfig,
  type RequestContext,
  SOURCE_BACKEND,
  setSentryCorrelationTags,
  shouldSendToSentry,
  UNKNOWN_VALUE,
} from '@/helpers/middleware';

type SentryLevel = 'warning' | 'error';

const LOG_LEVEL_TO_SENTRY_LEVEL: Record<LogLevel, SentryLevel> = {
  trace: 'warning',
  debug: 'warning',
  info: 'warning',
  warn: 'warning',
  error: 'error',
  fatal: 'error',
} as const;

interface LogData {
  message?: string;
  err?: Error;
  [key: string]: unknown;
}

interface EnrichedLogData extends LogData {
  requestId?: string;
  traceId?: string;
  sessionId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  entiteId?: string;
  caller?: string;
  extraContext?: Record<string, string>;
}

const createEnrichedData = (data: string | LogData, context: RequestContext): EnrichedLogData => {
  const logData = typeof data === 'string' ? { message: data } : { ...data };
  const extraContext = getLogExtraContext();

  return {
    ...logData,
    requestId: context.requestId,
    traceId: context.traceId,
    sessionId: context.sessionId,
    userId: context.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    entiteId: context.entiteId,
    caller: getCaller(),
    ...(Object.keys(extraContext).length > 0 && { extraContext }),
  };
};

const extractLogMessage = (data: string | LogData, defaultMessage: string): string => {
  return typeof data === 'string' ? data : data.message || defaultMessage;
};

const createLogMethod = (
  baseLogger: pino.Logger,
  level: LogLevel,
  context: RequestContext,
  logConfig: LogLevelConfig,
) => {
  return (data: string | LogData, message?: string) => {
    const logData = typeof data === 'string' ? { message: data } : { ...data };
    const logMessage = message || extractLogMessage(data, `${level.charAt(0).toUpperCase() + level.slice(1)} message`);
    const enrichedData = createEnrichedData(data, context);

    baseLogger[level](enrichedData, logMessage);

    if (shouldSendToSentry(level, logConfig)) {
      const sentryLevel = LOG_LEVEL_TO_SENTRY_LEVEL[level];
      sendToSentry(sentryLevel, logMessage, enrichedData, logData.err);
    }
  };
};

const createEnhancedLogger = (baseLogger: pino.Logger, context: RequestContext) => {
  if (!baseLogger) {
    throw new Error('Base logger is required but was undefined');
  }

  const logConfig = getLogLevelConfig();

  return {
    ...baseLogger,

    info: createLogMethod(baseLogger, 'info', context, logConfig),
    warn: createLogMethod(baseLogger, 'warn', context, logConfig),
    error: createLogMethod(baseLogger, 'error', context, logConfig),
    debug: createLogMethod(baseLogger, 'debug', context, logConfig),

    trace: createLogMethod(baseLogger, 'trace', context, logConfig),
    fatal: createLogMethod(baseLogger, 'fatal', context, logConfig),
    child: baseLogger.child ? baseLogger.child.bind(baseLogger) : () => baseLogger,
    level: baseLogger.level || 'info',
  };
};

const sendToSentry = (level: SentryLevel, message: string, enrichedData: EnrichedLogData, error?: Error): void => {
  Sentry.withScope((scope) => {
    scope.setLevel(level);

    if (enrichedData.userId) {
      scope.setUser({
        id: enrichedData.userId,
        ...(enrichedData.ip &&
          enrichedData.ip !== UNKNOWN_VALUE && {
            ip_address: enrichedData.ip,
          }),
      });
    }

    const context: RequestContext = {
      requestId: enrichedData.requestId || UNKNOWN_VALUE,
      traceId: enrichedData.traceId || UNKNOWN_VALUE,
      sessionId: enrichedData.sessionId || UNKNOWN_VALUE,
      userId: enrichedData.userId,
      ip: enrichedData.ip || UNKNOWN_VALUE,
      userAgent: enrichedData.userAgent || UNKNOWN_VALUE,
      entiteId: enrichedData.entiteId,
    };

    setSentryCorrelationTags(scope, context);
    if (enrichedData.caller) scope.setTag('caller', enrichedData.caller);

    if (enrichedData.extraContext) {
      for (const [key, value] of Object.entries(enrichedData.extraContext)) {
        scope.setTag(key, value);
      }
    }

    scope.setContext('request', {
      id: enrichedData.requestId,
      traceId: enrichedData.traceId,
      sessionId: enrichedData.sessionId,
      ...(enrichedData.ip &&
        enrichedData.ip !== UNKNOWN_VALUE && {
          ip: enrichedData.ip,
        }),
      userAgent: enrichedData.userAgent,
      source: SOURCE_BACKEND,
    });

    if (enrichedData.entiteId || enrichedData.userId) {
      scope.setContext('business', {
        userId: enrichedData.userId,
        entiteId: enrichedData.entiteId,
      });
    }

    scope.setContext('logging', {
      caller: enrichedData.caller,
      level,
      ...(enrichedData.extraContext && {
        extraContext: enrichedData.extraContext,
      }),
    });

    if (error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(message, level);
    }
  });
};

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

export default () => {
  return createPinoLogger('[{requestId}] {req.method} {req.url} {res.statusCode}', () => crypto.randomUUID());
};

export const enhancedPinoMiddleware = () => {
  const basePinoMiddleware = createPinoLogger(
    '[{requestId}] {message}',
    (c) => c?.req.header('x-request-id') || crypto.randomUUID(),
  );

  return createMiddleware(async (c: Context, next: () => Promise<void>) => {
    return basePinoMiddleware(c, async () => {
      const context = extractRequestContext(c);

      const baseLogger = c.get('logger');
      const enhancedLogger = createEnhancedLogger(baseLogger, context);

      c.set('logger', enhancedLogger);

      c.header('x-request-id', context.requestId);
      c.header('x-trace-id', context.traceId);

      await next();
    });
  });
};
