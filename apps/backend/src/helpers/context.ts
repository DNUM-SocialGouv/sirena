import { throwHTTPException400BadRequest } from '@sirena/backend-utils/helpers';
import { ERROR_KIND } from '@sirena/common/constants';
import type { Context } from 'hono';
import type { AppBindings } from './factories/appWithRole.js';

export type EntiteScopedContext = Context<AppBindings>;

const DEFAULT_TOP_ENTITE_ERROR = 'You are not allowed to read requetes without topEntiteId.';

export const requireTopEntiteId = (c: EntiteScopedContext, message = DEFAULT_TOP_ENTITE_ERROR): string => {
  const topEntiteId = c.get('topEntiteId');
  if (!topEntiteId) {
    throwHTTPException400BadRequest(message, { res: c.res, kind: ERROR_KIND.BUSINESS });
  }
  return topEntiteId;
};

export const requireUserId = (c: EntiteScopedContext, message = 'userId required'): string => {
  const userId = c.get('userId');
  if (!userId) {
    throwHTTPException400BadRequest(message, { res: c.res, kind: ERROR_KIND.BUSINESS });
  }
  return userId;
};
