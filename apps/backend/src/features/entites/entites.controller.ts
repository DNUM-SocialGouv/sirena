import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { getEntiteChainRoute, getEntitesRoute } from './entites.route';
import { GetEntitiesQuerySchema } from './entites.schema';
import { getEditableEntitiesChain, getEntiteDescendantIds, getEntites, getEntitesByIds } from './entites.service';

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
