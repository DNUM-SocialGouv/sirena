import { envVars } from '@/config/env';
import { pinoLogger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';

export default () => {
  return pinoLogger({
    pino: pino(
      {
        level: 'info',
        serializers: {
          err: pino.stdSerializers.err,
          // Serializers personnalisés pour un logging concis en JSON et pretty
          req: (req: Record<string, unknown>) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: Record<string, unknown>) => ({
            status: res.status,
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
    ),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
};
