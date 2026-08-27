import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { ERROR_KIND, ROLES_STATISTICS } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { createTextStream, StreamCancelledError } from '../../helpers/stream.js';
import { splitCsv } from '../../helpers/string.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { getEntiteById } from '../entites/entites.service.js';
import { type ExportRequetesCsvWriter, prepareExportRequetesCsv } from './exportRequetes/exportRequetes.service.js';
import { getExportRequetesRoute, getStatisticsDashboardRoute } from './statistics.route.js';
import { StatisticsDashboardQuerySchema } from './statistics.schema.js';
import { fetchDashboardCardsData } from './statistics.service.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([...ROLES_STATISTICS]))
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

    let writeCsv: ExportRequetesCsvWriter;
    try {
      writeCsv = await prepareExportRequetesCsv(topEntiteId);
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      logger.error({ err, topEntiteId, durationMs }, '[statistics] export requêtes generation failed');
      throw err;
    }

    const today = new Date().toISOString().slice(0, 10);
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="export-requetes-sirena-${today}.csv"`);

    let csvSizeBytes = 0;

    return c.body(
      createTextStream(async (write) => {
        try {
          await writeCsv(async (chunk) => {
            csvSizeBytes += Buffer.byteLength(chunk, 'utf8');
            await write(chunk);
          });
          const durationMs = Date.now() - startedAt;
          logger.info({ topEntiteId, durationMs, csvSizeBytes }, '[statistics] export requêtes generated successfully');
        } catch (err) {
          const durationMs = Date.now() - startedAt;
          if (err instanceof StreamCancelledError) {
            logger.info(
              { topEntiteId, durationMs, csvSizeBytes },
              '[statistics] export requêtes aborted by the client',
            );
          } else {
            logger.error(
              { err, topEntiteId, durationMs, csvSizeBytes },
              '[statistics] export requêtes streaming failed',
            );
          }
          throw err;
        }
      }),
    );
  })

  .get('/dashboard', getStatisticsDashboardRoute, zValidator('query', StatisticsDashboardQuerySchema), async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');
    const topEntiteId = c.get('topEntiteId');
    const { startDate, endDate, domaineIds, includeEIG } = c.req.valid('query');

    const optionalParams = {
      start_date: startDate,
      end_date: endDate,
      domaine_fonctionnel: splitCsv(domaineIds),
      inclure_eig: includeEIG,
    };

    if (entiteIds === null) {
      const cards = await fetchDashboardCardsData({}, optionalParams, 'national');
      return c.json({ data: { cards } });
    }

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

    // entity_label est verrouillé côté serveur (sécurité : périmètre de l'entité de l'utilisateur).
    // Les bornes de date sont des filtres optionnels : le service ne les signe que si le dashboard
    // les déclare réellement, donc un dashboard sans filtre de date continue de fonctionner.
    // Voir docs/metabase_dashboards/FILTERS.md.
    const cards = await fetchDashboardCardsData({ entity_label: topEntite.label }, optionalParams);
    return c.json({ data: { cards } });
  });

export default app;
