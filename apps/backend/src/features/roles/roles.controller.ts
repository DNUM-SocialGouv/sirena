import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { getRolesRoute } from './roles.route.js';
import { getRoles } from './roles.service.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)

  .get('/', getRolesRoute, async (c) => {
    const logger = c.get('logger');
    const roles = await getRoles();
    logger.info({ roleCount: roles.length }, 'Roles list retrieved successfully');

    return c.json({ data: roles }, 200);
  });

export default app;
