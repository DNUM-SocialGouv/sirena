import { createFactory } from 'hono/factory';

import type { PinoLogger } from 'hono-pino';

export type AppBindingsLogs = {
  Variables: {
    logger: PinoLogger;
  };
};

export default createFactory<AppBindingsLogs>();
