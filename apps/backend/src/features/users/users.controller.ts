import { throwHTTPException400BadRequest, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES, type Role, STATUT_TYPES } from '@sirena/common/constants';
import { getAssignableRoles } from '@sirena/common/utils';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import userChangelogMiddleware from '@/middlewares/changelog/changelog.user.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { ChangeLogAction } from '../changelog/changelog.type';
import { sendUserActivationEmail } from './users.notification.service';
import { getUserRoute, getUsersRoute, patchUserRoute } from './users.route';
import { GetUsersQuerySchema, PatchUserSchema } from './users.schema';
import { getUserById, getUsers, patchUser } from './users.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]))
  .use(entitesMiddleware)

  .get('/', getUsersRoute, zValidator('query', GetUsersQuerySchema), async (c) => {
    const logger = c.get('logger');
    const query = c.req.valid('query');
    const entiteIds = c.get('entiteIds');
    const roleId = c.get('roleId') as Role;
    const roles: string[] = getAssignableRoles(roleId).map(({ key }) => key);

    if (query.roleId?.some((roleOption) => !roles.includes(roleOption))) {
      throwHTTPException400BadRequest('You are not allowed to filter on this role.', {
        res: c.res,
      });
    }

    const { data, total } = await getUsers(entiteIds, query);
    logger.info({ userCount: data.length, total }, 'Users list retrieved successfully');

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
    const logger = c.get('logger');
    const id = c.req.param('id');
    const entiteIds = c.get('entiteIds');
    const roleId = c.get('roleId') as Role;
    const roles = getAssignableRoles(roleId).map(({ key }) => key);

    const user = await getUserById(id, entiteIds, roles);
    if (!user) {
      logger.warn({ userId: id }, 'User not found or unauthorized access');
      throwHTTPException404NotFound('User not found', {
        res: c.res,
      });
    }
    logger.info({ userId: id }, 'User details retrieved successfully');
    return c.json({ data: user }, 200);
  })

  .patch(
    '/:id',
    patchUserRoute,
    zValidator('json', PatchUserSchema),
    userChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const json = c.req.valid('json');
      const id = c.req.param('id');
      const userId = c.get('userId');
      const entiteIds = c.get('entiteIds');
      const roleId = c.get('roleId') as Role;

      const roles = getAssignableRoles(roleId).map(({ key }) => key);

      logger.info({ targetUserId: id, requestedChanges: Object.keys(json) }, 'User update requested');

      // user cannot update their own role
      if (userId === id && 'roleId' in json) {
        logger.warn({ userId: id }, 'User attempted to modify own role');
        delete json.roleId;
      }

      // check user can patch this user with applicable roles
      const userToPatch = await getUserById(id, entiteIds, roles);
      if (!userToPatch) {
        throwHTTPException404NotFound('User not found', {
          res: c.res,
        });
      }

      if (json.roleId && !(roles as string[]).includes(json.roleId)) {
        throwHTTPException400BadRequest('No permissions', {
          res: c.res,
        });
      }

      const newEntiteId = json.entiteId ?? undefined;
      const currentEntiteId = userToPatch.entiteId ?? undefined;

      if (newEntiteId === currentEntiteId) {
        delete json.entiteId;
      } else if (newEntiteId && entiteIds !== null && !entiteIds.includes(newEntiteId)) {
        throwHTTPException400BadRequest('No permissions');
      }

      // Check if status is changing to ACTIF to send activation email
      const isActivating = json.statutId === STATUT_TYPES.ACTIF && userToPatch.statutId !== STATUT_TYPES.ACTIF;

      const user = await patchUser(id, json);

      logger.info({ userId: id }, 'User updated successfully');

      if (isActivating) {
        sendUserActivationEmail(id, userId).catch((error) => {
          logger.error({ userId: id, error }, 'Failed to send activation email');
        });
      }

      return c.json({ data: user });
    },
  );

export default app;
