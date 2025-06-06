import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import { getRolesRoute } from './roles.route';
import { getRoles } from './roles.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)

  .get('/', getRolesRoute, async (c) => {
    const roles = await getRoles();
    return c.json({ data: roles }, 200);
  });

export default app;
