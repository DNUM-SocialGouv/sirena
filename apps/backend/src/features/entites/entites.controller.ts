import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import { getEntiteChainRoute, getEntitesRoute } from './entites.route';
import { GetEntitiesQuerySchema } from './entites.schema';
import { getEditableEntitiesChain, getEntites } from './entites.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]))
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
