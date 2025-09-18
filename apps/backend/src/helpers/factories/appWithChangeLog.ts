import { createFactory } from 'hono/factory';
import type { AppBindings as AuthAppBindings } from './appWithAuth';

// ChangeLog-specific variables
type ChangeLogVariables = {
  changelogId: string | null;
};

// ChangeLog middleware extends auth bindings with changelog data
export type AppBindings = {
  Variables: AuthAppBindings['Variables'] & ChangeLogVariables;
};

export default createFactory<AppBindings>();
