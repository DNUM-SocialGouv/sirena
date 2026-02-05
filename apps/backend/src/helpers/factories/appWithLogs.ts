import { createFactory } from 'hono/factory';

import type { PinoLogger } from 'hono-pino';
import type { ApiKey } from '../../libs/prisma.js';

export type AppBindings = {
  Variables: {
    logger: PinoLogger;
    apiKey?: ApiKey & { account: { id: string } };
  };
};

export default createFactory<AppBindings>();
