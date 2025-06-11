import logger from '@/libs/pino';
import { pinoLogger } from 'hono-pino';

export default () => {
  return pinoLogger({
    pino: logger,
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
};
