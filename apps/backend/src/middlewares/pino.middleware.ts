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
      pretty(),
    ),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
};
