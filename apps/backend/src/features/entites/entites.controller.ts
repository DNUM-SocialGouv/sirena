import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import { getEntiteChainRoute, getEntitesRoute } from './entites.route';
import { GetEntitiesQuerySchema } from './entites.schema';
import { getEntiteChain, getEntites } from './entites.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN]))

  .get('/chain/:id?', getEntiteChainRoute, async (c) => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ data: [] });
    }
    const chains = await getEntiteChain(id);
    return c.json({ data: chains });
  })

  .get('/:id?', getEntitesRoute, zValidator('query', GetEntitiesQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const id = c.req.param('id') || null;
    const { data, total } = await getEntites(id, query);
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
