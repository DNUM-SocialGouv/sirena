import pino from 'pino';
import pretty from 'pino-pretty';

export const createPinoConfig = (): pino.LoggerOptions => {
  return {
    level: 'info',
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
  process.env.LOG_FORMAT === 'pretty'
    ? pretty({
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
        messageFormat,
      })
    : undefined;

export const logger = pino(createPinoConfig(), createPrettyConfig('{msg}'));

export const logMessage = (message: string, ...args: unknown[]) => {
  if (args.length > 0) {
    logger.info({ args }, message);
  } else {
    logger.info(message);
  }
};

export const logError = (message: string, ...args: unknown[]) => {
  if (args.length > 0) {
    logger.error({ args }, message);
  } else {
    logger.error(message);
  }
};
