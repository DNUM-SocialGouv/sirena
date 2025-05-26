import { createFactory } from 'hono/factory';

import type { PinoLogger } from 'hono-pino';

export type AppBindings = {
  Variables: {
    logger: PinoLogger;
  };
};

export default createFactory<AppBindings>();
