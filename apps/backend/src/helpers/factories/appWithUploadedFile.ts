import type { Readable } from 'node:stream';
import { createFactory } from 'hono/factory';

import type { PinoLogger } from 'hono-pino';

export interface UploadedFileContext {
  stream: Readable;
  fileName: string;
  contentType: string;
  getReadBytes: () => number;
}

export type AppBindings = {
  Variables: {
    logger: PinoLogger;
    userId: string;
    roleId: string;
    entiteIds: string[];
    uploadedFile?: UploadedFileContext;
  };
};

export default createFactory<AppBindings>();
