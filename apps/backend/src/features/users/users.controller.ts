import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { zValidator } from '@hono/zod-validator';
import { GetUsersQuerySchema, getUserRoute, getUsersRoute } from './users.route';
import { getUserById, getUsers } from './users.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)

  .get('/', getUsersRoute, zValidator('query', GetUsersQuerySchema), async (c) => {
    const { roleId, active } = c.req.valid('query');

    const filters = { roleId, active };

    const users = await getUsers(filters);
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
