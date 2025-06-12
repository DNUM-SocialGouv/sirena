import { envVars } from '@/config/env';
import type { Context } from 'hono';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(
  {
    level: 'info',
    serializers: {
      err: pino.stdSerializers.err,
      // Serializers personnalisés pour un logging concis en JSON et pretty
      req: (c: Context) => ({
        method: c.req.method,
        url: c.req.url,
      }),
      res: (c: Context) => ({
        status: c.res.status,
      }),
    },
  },
  envVars.LOG_FORMAT === 'pretty'
    ? pretty({
        // Configuration pour un affichage plus concis en mode pretty
        ignore: 'pid,hostname,time',
        translateTime: 'SYS:standard',
        messageFormat: '{req.method} {req.url} {res.statusCode}',
      })
    : undefined,
);

export default logger;
