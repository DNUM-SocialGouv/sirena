import { APP_VERSION, GIT_COMMIT } from '@/config/version.constant';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { getVersionRoute } from './version.route';

const app = factoryWithLogs
  .createApp()

  .get('/', getVersionRoute, async (c) => {
    return c.json({ version: `${APP_VERSION}@${GIT_COMMIT}` });
  });

export default app;
