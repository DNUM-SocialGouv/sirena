import { createFactory } from 'hono/factory';
import type { AppBindings as RoleAppBindings } from './appWithRole.js';

// ChangeLog-specific variables
type ChangeLogVariables = {
  changelogId: string | null;
};

// ChangeLog middleware extends auth bindings with changelog data
export type AppBindings = {
  Variables: RoleAppBindings['Variables'] & ChangeLogVariables;
};

export default createFactory<AppBindings>();
