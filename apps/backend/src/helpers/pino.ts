import type { Context } from 'hono';
import { pinoLogger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';
import { envVars } from '../config/env.js';
import { getLogLevelConfig } from '../helpers/middleware.js';

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

/**
 * Logger des scripts d'exploitation.
 *
 * Ceux-ci se terminent par `process.exit`, qui n'attend pas le vidage des tampons : la
 * destination est synchrone pour que les derniers logs survivent à la sortie du processus.
 */
export const createScriptLogger = () => {
  const destination =
    envVars.LOG_FORMAT === 'pretty'
      ? pretty({ ignore: 'pid,hostname', translateTime: 'SYS:standard', messageFormat: '{msg}', sync: true })
      : pino.destination({ sync: true });

  return pino(createPinoConfig(), destination);
};
