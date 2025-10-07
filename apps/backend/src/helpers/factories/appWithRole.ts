import { createFactory } from 'hono/factory';

import type { PinoLogger } from 'hono-pino';

export type AppBindings = {
  Variables: {
    logger: PinoLogger;
    userId: string;
    roleId: string;
    entiteIds: string[] | null;
  };
};

export default createFactory<AppBindings>();
