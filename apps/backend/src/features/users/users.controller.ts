import { throwHTTPException400BadRequest, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES, type Role } from '@sirena/common/constants';
import { getAssignableRoles } from '@sirena/common/utils';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import { getUserRoute, getUsersRoute, patchUserRoute } from './users.route';
import { GetUsersQuerySchema, PatchUserSchema } from './users.schema';
import { getUserById, getUsers, patchUser } from './users.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]))
  .use(entitesMiddleware)

  .get('/', getUsersRoute, zValidator('query', GetUsersQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const entiteIds = c.get('entiteIds');

    const { data, total } = await getUsers(entiteIds, query);
    return c.json({
      data,
      meta: {
        ...(query.offset !== undefined && { offset: query.offset }),
        ...(query.limit !== undefined && { limit: query.limit }),
        total,
      },
    });
  })

  .get('/:id', getUserRoute, async (c) => {
    const id = c.req.param('id');
    const entiteIds = c.get('entiteIds');

    const user = await getUserById(id, entiteIds);
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
    const userId = c.get('userId');

    // user cannot update their own role
    if (userId === id && 'roleId' in json) {
      delete json.roleId;
    }

    // check user can assignes permitted roles
    const roleId = c.get('roleId') as Role;
    const roles = getAssignableRoles(roleId);

    if (json.roleId && !roles.find((roleOption) => roleOption.key === json.roleId)) {
      throwHTTPException400BadRequest('Role not assignable', {
        res: c.res,
      });
    }

    // check user can assignes permitted entites
    const entiteIds = c.get('entiteIds');
    if (json.entiteId && entiteIds !== null && !entiteIds.includes(json.entiteId)) {
      throwHTTPException400BadRequest('Entité not assignable', {
        res: c.res,
      });
    }
    const user = await patchUser(id, json, entiteIds);

    if (!user) {
      throwHTTPException404NotFound('User not found', {
        res: c.res,
      });
    }
    return c.json({ data: user });
  });

export default app;
