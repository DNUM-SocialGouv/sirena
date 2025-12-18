import { createFactory } from 'hono/factory';

import type { PinoLogger } from 'hono-pino';

export type AppBindings = {
  Variables: {
    logger: PinoLogger;
    userId: string;
    roleId: string;
    entiteIds: string[];
    uploadedFile?: {
      buffer: Buffer;
      fileName: string;
      contentType: string;
      size: number;
    };
  };
};

export default createFactory<AppBindings>();
