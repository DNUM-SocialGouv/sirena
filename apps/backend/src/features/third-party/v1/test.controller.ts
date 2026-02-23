import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import { getRequiredApiKey } from '../thirdPartyFactory.js';
import { getTestRoute } from './test.route.js';

const app = factoryWithLogs.createApp().get('/', getTestRoute, (c) => {
  const apiKey = getRequiredApiKey(c);
  const logger = c.get('logger');
  const traceId = (logger.bindings() as { traceId?: string }).traceId ?? 'unknown';

  c.header('x-trace-id', traceId);
  return c.json({
    message: 'Authentication successful',
    accountId: apiKey.accountId,
    keyPrefix: apiKey.keyPrefix,
  });
});

export default app;
