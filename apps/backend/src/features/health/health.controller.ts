import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { getHealthRoute } from './health.route';
import { checkHealth } from './health.service';

const app = factoryWithLogs
  .createApp()

  .get('/', getHealthRoute, async (c) => {
    await checkHealth();
    return c.json({ data: { status: 'ok' } });
  });

export default app;
