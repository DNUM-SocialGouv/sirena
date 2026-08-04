import { createFactory } from 'hono/factory';

import type { PinoLogger } from 'hono-pino';
import type { Prisma } from '../../libs/prisma.js';

export type AuthenticatedUser = Prisma.UserGetPayload<{ include: { role: true } }>;

export type AppBindings = {
  Variables: {
    logger: PinoLogger;
    userId: string;
    roleId: string;
    user: AuthenticatedUser;
    entiteIds: string[] | null;
    assignedEntiteId: string | null;
    topEntiteId: string | null;
  };
};

export default createFactory<AppBindings>();
