import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { ERROR_KIND } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { getEntiteById } from '../entites/entites.service.js';
import { getStatisticsCardDataRoute, getStatisticsDashboardRoute } from './statistics.route.js';
import { StatisticsCardParamsSchema } from './statistics.schema.js';
import { fetchCardData, fetchDashboardCardsData } from './statistics.service.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(entitesMiddleware)
  .use(async (c, next) => {
    const entiteIds = c.get('entiteIds');
    // entiteIds === null  -> SUPER_ADMIN (système-wide), autorisé
    // entiteIds === []    -> rôle métier sans rattachement, refusé
    if (entiteIds !== null && entiteIds.length === 0) {
      throwHTTPException403Forbidden('Forbidden, you must be linked to an entity to access statistics', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }
    return next();
  })

  .get(
    '/cards/:cardId/data',
    getStatisticsCardDataRoute,
    zValidator('param', StatisticsCardParamsSchema),
    async (c) => {
      const { cardId } = c.req.valid('param');
      const data = await fetchCardData(cardId);
      return c.json({ data });
    },
  )

  .get('/dashboard', getStatisticsDashboardRoute, async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');
    const topEntiteId = c.get('topEntiteId');

    if (!topEntiteId) {
      throwHTTPException403Forbidden('User must be linked to an entity to access the statistics dashboard', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }

    const topEntite = await getEntiteById(topEntiteId);
    if (!topEntite?.label) {
      logger.error({ userId, topEntiteId }, '[statistics] top entity has no label');
      throwHTTPException403Forbidden('User top entity has no label, cannot scope the dashboard', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }

    const cards = await fetchDashboardCardsData({ entity_label: topEntite.label });
    return c.json({ data: { cards } });
  });

export default app;
