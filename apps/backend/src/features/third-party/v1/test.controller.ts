import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import { apiKeyAuth } from '../../../middlewares/apiKey.middleware.js';
import { getTestRoute } from './test.route.js';

const app = factoryWithLogs
  .createApp()
  .use('/*', apiKeyAuth())
  .get('/', getTestRoute, (c) => {
    const apiKey = c.get('apiKey');
    const logger = c.get('logger');
    const loggerBindings = logger?.bindings?.() as { traceId?: string } | undefined;
    const traceId = loggerBindings?.traceId ?? 'unknown';

    return c.json({
      message: 'Authentication successful',
      accountId: apiKey?.accountId,
      keyPrefix: apiKey?.keyPrefix,
      traceId,
    });
  });

export default app;
