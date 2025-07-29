import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import { getRolesRoute } from './roles.route';
import { getRoles } from './roles.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)

  .get('/', getRolesRoute, async (c) => {
    const logger = c.get('logger');
    const roles = await getRoles();
    logger.info({ roleCount: roles.length }, 'Roles list retrieved successfully');

    return c.json({ data: roles }, 200);
  });

export default app;
