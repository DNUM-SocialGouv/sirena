import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import { apiKeyAuth } from '../../../middlewares/apiKey.middleware.js';

const app = factoryWithLogs
  .createApp()
  .use('/*', apiKeyAuth())
  .get((c) => {
    const apiKey = c.get('apiKey');
    const logger = c.get('logger');
    const loggerBindings = logger?.bindings?.() as { traceId?: string } | undefined;
    const traceId = loggerBindings?.traceId ?? 'unknown';

    return c.json({
      success: true,
      message: 'Authentication successful',
      data: {
        accountId: apiKey?.accountId,
        keyPrefix: apiKey?.keyPrefix,
        traceId,
      },
    });
  });

export default app;
