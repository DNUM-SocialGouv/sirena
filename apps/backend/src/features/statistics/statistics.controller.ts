import {
  throwHTTPException400BadRequest,
  throwHTTPException403Forbidden,
  throwHTTPException409Conflict,
} from '@sirena/backend-utils/helpers';
import {
  ERROR_KIND,
  EXPORT_REQUETES_ERROR_CODES,
  EXPORT_REQUETES_ERROR_MESSAGES,
  ROLES_STATISTICS,
} from '@sirena/common/constants';
import { getDateTodayInParis, validateExportPeriod } from '@sirena/common/utils';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { splitCsv } from '../../helpers/string.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { DOCUMENT_EXPORT_TYPE, findActiveDocumentExport } from '../documentExports/documentExports.service.js';
import { getEntiteById } from '../entites/entites.service.js';
import { requestExportRequetes } from './exportRequetes/requestExportRequetes.service.js';
import {
  getExportRequetesStatusRoute,
  getStatisticsDashboardRoute,
  postExportRequetesRoute,
} from './statistics.route.js';
import { ExportRequetesBodySchema, StatisticsDashboardQuerySchema } from './statistics.schema.js';
import { type DashboardFilterSlug, fetchDashboardData } from './statistics.service.js';

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

  .get('/requetes-export/status', getExportRequetesStatusRoute, async (c) => {
    const activeExport = await findActiveDocumentExport(c.get('userId'), DOCUMENT_EXPORT_TYPE.REQUETES_CSV);

    return c.json({ data: { inProgress: activeExport != null } });
  })

  .post('/requetes-export', postExportRequetesRoute, zValidator('json', ExportRequetesBodySchema), async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');
    const user = c.get('user');
    const topEntiteId = c.get('topEntiteId');

    // Exports are scoped to an entity: a super admin (national scope) has none.
    if (!topEntiteId) {
      throwHTTPException403Forbidden('User must be linked to an entity to export requêtes', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }

    const { startDate, endDate } = c.req.valid('json');
    const periodError = validateExportPeriod({ startDate, endDate }, getDateTodayInParis());
    if (periodError) {
      throwHTTPException400BadRequest(EXPORT_REQUETES_ERROR_MESSAGES[periodError.code], {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
        cause: { code: periodError.code, field: periodError.field },
      });
    }

    const result = await requestExportRequetes({
      userId,
      topEntiteId,
      startDate,
      endDate,
      path: c.req.routePath,
      requestId: c.req.header('x-request-id') ?? c.res.headers.get('x-request-id'),
    });

    if (!result.ok) {
      const errorOptions = { res: c.res, kind: ERROR_KIND.BUSINESS, cause: { code: result.code } };
      if (result.code === EXPORT_REQUETES_ERROR_CODES.EXPORT_IN_PROGRESS) {
        throwHTTPException409Conflict(EXPORT_REQUETES_ERROR_MESSAGES[result.code], errorOptions);
      }
      throwHTTPException400BadRequest(EXPORT_REQUETES_ERROR_MESSAGES[result.code], errorOptions);
    }

    logger.info({ documentExportId: result.documentExportId }, '[statistics] export requêtes queued');

    return c.json({ data: { id: result.documentExportId, email: user.email } }, 202);
  })

  .get('/dashboard', getStatisticsDashboardRoute, zValidator('query', StatisticsDashboardQuerySchema), async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');
    const topEntiteId = c.get('topEntiteId');
    const { startDate, endDate, domaineIds, includeEIG, lieuTypes } = c.req.valid('query');

    const optionalParams: Record<DashboardFilterSlug, string | string[] | undefined> = {
      start_date: startDate,
      end_date: endDate,
      domaine_fonctionnel: splitCsv(domaineIds),
      inclure_eig: includeEIG,
      lieu_de_survenue: splitCsv(lieuTypes),
    };

    if (entiteIds === null) {
      const dashboard = await fetchDashboardData({}, optionalParams, 'national');
      return c.json({ data: dashboard });
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
    const dashboard = await fetchDashboardData({ entity_label: topEntite.label }, optionalParams);
    return c.json({ data: dashboard });
  });

export default app;
