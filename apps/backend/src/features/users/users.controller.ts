import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { isOperationDependsOnRecordNotFoundError } from '@/helpers/prisma';
import authMiddleware from '@/middlewares/auth.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import { getUserRoute, getUsersRoute, patchUserRoute } from './users.route';
import { GetUsersQuerySchema, PatchUserSchema } from './users.schema';
import { getUserById, getUsers, patchUser } from './users.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN]))

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
      throwHTTPException404NotFound('User not found', {
        res: c.res,
      });
    }
    return c.json({ data: user }, 200);
  })

  .patch('/:id', patchUserRoute, zValidator('json', PatchUserSchema), async (c) => {
    const json = c.req.valid('json');
    const id = c.req.param('id');
    try {
      const user = await patchUser(id, json);
      return c.json({ data: user }, 200);
    } catch (error) {
      if (isOperationDependsOnRecordNotFoundError(error)) {
        throwHTTPException404NotFound('User not found', {
          res: c.res,
        });
      } else {
        throw error;
      }
    }
  });

export default app;
