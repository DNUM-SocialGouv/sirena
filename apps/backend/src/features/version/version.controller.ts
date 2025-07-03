import { APP_VERSION } from '@/config/version.constant';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { getVersionRoute } from './version.route';

const app = factoryWithLogs
  .createApp()

  .get('/', getVersionRoute, async (c) => {
    return c.json({ data: { version: `${APP_VERSION}` } });
  });

export default app;
