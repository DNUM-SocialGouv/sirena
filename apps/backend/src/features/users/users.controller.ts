import { throwHTTPException404NotFound } from '@/helpers/apiErrors.ts';
import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import authMiddleware from '@/middlewares/auth.middleware.ts';
import { getUserRoute, getUsersRoute } from './users.route.ts';
import { getUserById, getUsers } from './users.service.ts';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)

  .get('/', getUsersRoute, async (c) => {
    const users = await getUsers();
    return c.json({ data: users }, 200);
  })

  .get('/:id', getUserRoute, async (c) => {
    const id = c.req.param('id');
    const user = await getUserById(id);
    if (!user) {
      throwHTTPException404NotFound();
    }
    return c.json({ data: user }, 200);
  });

export default app;
