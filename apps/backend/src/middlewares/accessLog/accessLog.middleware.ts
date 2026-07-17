import type { Context } from 'hono';
import { createAccessLog } from '../../features/accessLog/accessLog.service.js';
import type { AccessLogAction } from '../../features/accessLog/accessLog.type.js';
import type { AppBindings } from '../../helpers/factories/appWithAccessLog.js';
import factoryWithAccessLog from '../../helpers/factories/appWithAccessLog.js';

interface AccessLogConfig {
  entity: string;
  action: AccessLogAction;
  getEntityId?: (c: Context<AppBindings>) => string | null;
}

const defaultGetEntityId = (c: Context<AppBindings>) => c.req.param('id') ?? null;

const createAccessLogMiddleware = (config: AccessLogConfig) => {
  return factoryWithAccessLog.createMiddleware(async (c, next) => {
    await next();

    if (c.res.status >= 400) {
      return;
    }

    const logger = c.get('logger');
    const entityId = (config.getEntityId ?? defaultGetEntityId)(c);

    if (!entityId) {
      logger.warn(
        `Access log action "${config.action}" for entity "${config.entity}" did not receive a valid entity ID`,
      );
      return;
    }

    const userId = c.get('userId') ?? null;

    if (!userId) {
      logger.warn(
        `Access log action "${config.action}" for entity "${config.entity}" recorded without an actor (userId is null)`,
      );
    }

    try {
      await createAccessLog({
        entity: config.entity,
        entityId,
        action: config.action,
        userId,
        requestId: c.res.headers.get('x-request-id'),
        path: c.req.routePath,
        dataKeys: c.get('accessLogDataKeys') ?? [],
      });
    } catch (error) {
      logger.error({ err: error }, `Failed to create access log for entity "${config.entity}" with ID "${entityId}"`);
    }
  });
};

export default createAccessLogMiddleware;
