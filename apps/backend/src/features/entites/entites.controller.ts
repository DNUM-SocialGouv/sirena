import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { isOperationDependsOnRecordNotFoundError } from '../../helpers/prisma.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { EntiteNotFoundError } from './entites.error.js';
import {
  createChildEntiteAdminRoute,
  editEntiteAdminRoute,
  getEntiteByIdAdminRoute,
  getEntiteChainRoute,
  getEntitesListAdminRoute,
  getEntitesRoute,
} from './entites.route.js';
import { CreateChildEntiteAdminInputSchema, EditEntiteInputSchema, GetEntitiesQuerySchema } from './entites.schema.js';
import {
  createChildEntiteAdmin,
  editEntiteAdmin,
  getEditableEntitiesChain,
  getEntiteById,
  getEntiteDescendantIds,
  getEntites,
  getEntitesByIds,
  getEntitesListAdmin,
} from './entites.service.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN, ROLES.WRITER, ROLES.READER, ROLES.NATIONAL_STEERING]))
  .use(entitesMiddleware)

  .get('/chain/:id?', getEntiteChainRoute, async (c) => {
    const logger = c.get('logger');
    const id = c.req.param('id');

    logger.info({ entiteId: id }, 'Entity chain requested');

    if (!id) {
      logger.info('Entity chain requested without ID - returning empty array');
      return c.json({ data: [] });
    }

    const entiteIds = c.get('entiteIds');
    const chains = await getEditableEntitiesChain(id, entiteIds);

    logger.info({ entiteId: id, chainLength: chains.length }, 'Entity chain retrieved successfully');
    return c.json({ data: chains });
  })

  .get('/descendants/:id', async (c) => {
    const id = c.req.param('id');

    const allIds = await getEntiteDescendantIds(id);

    if (!allIds) {
      return c.json({ data: [] });
    }

    const descendantIds = allIds.filter((entiteId) => entiteId !== id);

    if (descendantIds.length === 0) {
      return c.json({ data: [] });
    }

    const descendants = await getEntitesByIds(descendantIds);

    return c.json({ data: descendants });
  })

  .get(
    '/admin',
    roleMiddleware([ROLES.SUPER_ADMIN]),
    getEntitesListAdminRoute,
    zValidator('query', GetEntitiesQuerySchema),
    async (c) => {
      const logger = c.get('logger');
      const query = c.req.valid('query');

      logger.info({ query }, 'Admin entities list requested');
      const { data, total } = await getEntitesListAdmin(query);
      logger.info({ entitiesCount: data.length, total }, 'Admin entities list retrieved successfully');

      return c.json({
        data,
        meta: {
          ...(query.offset !== undefined && { offset: query.offset }),
          ...(query.limit !== undefined && { limit: query.limit }),
          total,
        },
      });
    },
  )

  .get('/admin/:id', roleMiddleware([ROLES.SUPER_ADMIN]), getEntiteByIdAdminRoute, async (c) => {
    const id = c.req.param('id');
    const logger = c.get('logger');

    const entite = await getEntiteById(id);

    if (!entite) {
      logger.warn({ entiteId: id }, 'Entite not found');
      throwHTTPException404NotFound('Entite not found', { res: c.res });
    }

    logger.info({ entite }, 'Entite retrieved successfully');

    return c.json({ data: entite });
  })

  .post(
    '/admin/:id/children',
    roleMiddleware([ROLES.SUPER_ADMIN]),
    zValidator('json', CreateChildEntiteAdminInputSchema),
    createChildEntiteAdminRoute,
    async (c) => {
      const id = c.req.param('id');
      const data = c.req.valid('json');
      const logger = c.get('logger');

      try {
        const entite = await createChildEntiteAdmin(id, data);
        return c.json({ data: entite });
      } catch (error) {
        if (error instanceof EntiteNotFoundError) {
          logger.warn({ entiteId: id }, 'Entite not found');
          throwHTTPException404NotFound('Entite not found', { res: c.res });
        }

        throw error;
      }
    },
  )

  .patch(
    '/admin/:id',
    roleMiddleware([ROLES.SUPER_ADMIN]),
    zValidator('json', EditEntiteInputSchema),
    editEntiteAdminRoute,
    async (c) => {
      const id = c.req.param('id');
      const data = c.req.valid('json');
      const logger = c.get('logger');

      try {
        const entite = await editEntiteAdmin(id, data);

        logger.info({ entite }, 'Edit entite successfully');

        return c.json({ data: entite });
      } catch (error) {
        if (isOperationDependsOnRecordNotFoundError(error)) {
          logger.warn({ entiteId: id }, 'Entite not found');
          throwHTTPException404NotFound('Entite not found', { res: c.res });
        }

        throw error;
      }
    },
  )

  .get('/:id?', getEntitesRoute, zValidator('query', GetEntitiesQuerySchema), async (c) => {
    const logger = c.get('logger');
    const query = c.req.valid('query');
    const id = c.req.param('id') || null;

    logger.info({ entiteId: id, query }, 'Entities list requested');
    const { data, total } = await getEntites(id, query);
    logger.info({ entiteId: id, entitiesCount: data.length, total }, 'Entities list retrieved successfully');

    return c.json({
      data,
      meta: {
        ...(query.offset !== undefined && { offset: query.offset }),
        ...(query.limit !== undefined && { limit: query.limit }),
        total,
      },
    });
  });

export default app;
