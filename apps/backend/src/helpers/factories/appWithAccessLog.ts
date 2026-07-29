import { createFactory } from 'hono/factory';
import type { AppBindings as RoleAppBindings } from './appWithRole.js';

type AccessLogVariables = {
  accessLogDataKeys?: string[];
};

export type AppBindings = {
  Variables: RoleAppBindings['Variables'] & AccessLogVariables;
};

export default createFactory<AppBindings>();
