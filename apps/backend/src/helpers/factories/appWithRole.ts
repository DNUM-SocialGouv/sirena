import { createFactory } from 'hono/factory';
import type { AppBindings as AuthAppBindings } from './appWithAuth.js';

export type AppBindings = {
  Variables: AuthAppBindings['Variables'] & {
    entiteIdLevel: number | null;
  };
};

export default createFactory<AppBindings>();
