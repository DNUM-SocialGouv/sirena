import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import { apiKeyAuth } from '../../../middlewares/apiKey.middleware.js';
import { rateLimiter } from '../../../middlewares/rateLimiter.middleware.js';
import { getTestRoute } from './test.route.js';

const app = factoryWithLogs
  .createApp()
  .use(rateLimiter())
  .use(apiKeyAuth())
  .get('/', getTestRoute, (c) => {
    const apiKey = c.get('apiKey');
    const logger = c.get('logger');
    const traceId = (logger.bindings() as { traceId?: string }).traceId ?? 'unknown';

    return c.json({
      message: 'Authentication successful',
      accountId: apiKey?.accountId,
      keyPrefix: apiKey?.keyPrefix,
      traceId,
    });
  });

export default app;
