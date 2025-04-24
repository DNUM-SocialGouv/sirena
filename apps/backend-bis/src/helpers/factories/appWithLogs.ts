import type { PinoLogger } from 'hono-pino';

export type AppBindingsLogs = {
  Variables: {
    logger: PinoLogger;
  };
};
