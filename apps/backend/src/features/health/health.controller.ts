import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { getHealthRoute } from './health.route';
import { checkHealth } from './health.service';

const app = factoryWithLogs
  .createApp()

  .get('/', getHealthRoute, async (c) => {
    const result = await checkHealth();
    if (!result.healthy) {
      const logger = c.get('logger');
      logger.error({ err: result.reason }, 'Health check failed');
      return c.json({ data: { status: 'error', message: result.reason } }, 500);
    }

    return c.json({ data: { status: 'ok' } });
  });

export default app;
