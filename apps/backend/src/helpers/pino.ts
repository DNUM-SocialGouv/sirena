import type { Context } from 'hono';
import { pinoLogger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';
import { envVars } from '@/config/env';
import { getLogLevelConfig } from '@/helpers/middleware';

export const createPinoConfig = (): pino.LoggerOptions => {
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

export const createPrettyConfig = (messageFormat: string): pretty.PrettyStream | undefined =>
  envVars.LOG_FORMAT === 'pretty'
    ? pretty({
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
        messageFormat,
      })
    : undefined;

export const createPinoLogger = (messageFormat: string, reqIdGenerator: (c?: Context) => string) =>
  pinoLogger({
    pino: pino(createPinoConfig(), createPrettyConfig(messageFormat)),
    http: {
      reqId: reqIdGenerator,
    },
  });

export const createDefaultLogger = () => {
  return pino(createPinoConfig(), createPrettyConfig('{msg}'));
};
