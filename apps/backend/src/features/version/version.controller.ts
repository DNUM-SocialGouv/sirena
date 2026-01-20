import { APP_VERSION } from '../../config/version.constant.js';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { getVersionRoute } from './version.route.js';

const app = factoryWithLogs
  .createApp()

  .get('/', getVersionRoute, async (c) => {
    return c.json({ data: { version: `${APP_VERSION}` } });
  });

export default app;
