import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { getHealthRoute } from './health.route.js';
import { checkHealth } from './health.service.js';

const app = factoryWithLogs
  .createApp()

  .get('/', getHealthRoute, async (c) => {
    await checkHealth();
    return c.json({ data: { status: 'ok' } });
  });

export default app;
