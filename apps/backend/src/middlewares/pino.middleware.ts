import { envVars } from '@/config/env.ts';
import { pinoLogger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';

export default () => {
  return pinoLogger({
    pino: pino.default(
      {
        level: 'info',
        serializers: { err: pino.stdSerializers.err },
      },
      envVars.LOG_FORMAT === 'pretty' ? pretty() : undefined,
    ),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
};
