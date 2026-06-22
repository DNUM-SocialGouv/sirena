import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { ERROR_KIND } from '@sirena/common/constants';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { getEntiteById } from '../entites/entites.service.js';
import { generateExportRequetesCsv } from './exportRequetes/exportRequetes.service.js';
import { getExportRequetesRoute, getStatisticsDashboardRoute } from './statistics.route.js';
import { fetchDashboardCardsData } from './statistics.service.js';

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

  .get('/export-requetes', getExportRequetesRoute, async (c) => {
    const logger = c.get('logger');
    const topEntiteId = c.get('topEntiteId');

    if (!topEntiteId) {
      throwHTTPException403Forbidden('User must be linked to an entity to export requêtes', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }

    const startedAt = Date.now();

    try {
      const csv = await generateExportRequetesCsv(topEntiteId);
      const durationMs = Date.now() - startedAt;
      const csvSizeBytes = Buffer.byteLength(csv, 'utf8');
      const today = new Date().toISOString().slice(0, 10);

      logger.info({ topEntiteId, durationMs, csvSizeBytes }, '[statistics] export requêtes generated successfully');

      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', `attachment; filename="export-requetes-sirena-${today}.csv"`);

      return c.body(csv);
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      logger.error({ err, topEntiteId, durationMs }, '[statistics] export requêtes generation failed');
      throw err;
    }
  })

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
