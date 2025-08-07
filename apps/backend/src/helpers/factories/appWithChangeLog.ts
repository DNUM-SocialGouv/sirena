import { createFactory } from 'hono/factory';

import type { PinoLogger } from 'hono-pino';

export type AppBindings = {
  Variables: {
    logger: PinoLogger;
    userId: string;
    roleId: string;
    changelogId: string | null;
  };
};

export default createFactory<AppBindings>();
