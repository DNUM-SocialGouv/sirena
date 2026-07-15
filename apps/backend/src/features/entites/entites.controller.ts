import { throwHTTPException400BadRequest, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ERROR_KIND, ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { isOperationDependsOnRecordNotFoundError } from '../../helpers/prisma.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import adminLocalDirectionsServicesFeatureFlagMiddleware from '../featureFlags/adminLocalDirectionsServicesFeatureFlag.middleware.js';
import { EntiteChildCreationForbiddenError, EntiteNotFoundError } from './entites.error.js';
import {
  createChildEntiteAdminRoute,
  createDirectionAdminLocalRoute,
  createServiceAdminLocalRoute,
  editDirectionServiceAdminLocalRoute,
  editEntiteAdminRoute,
  getDirectionServiceAdminLocalRoute,
  getDirectionsServicesListRoute,
  getEntiteByIdAdminRoute,
  getEntiteChainRoute,
  getEntitesListAdminRoute,
  getEntitesRoute,
  getRootEntitesListAdminRoute,
} from './entites.route.js';
import {
  CreateChildEntiteAdminInputSchema,
  CreateDirectionAdminLocalInputSchema,
  CreateServiceAdminLocalInputSchema,
  EditDirectionServiceAdminLocalInputSchema,
  EditEntiteInputSchema,
  GetEntitesListAdminQuerySchema,
  GetEntitiesQuerySchema,
} from './entites.schema.js';
import {
  createChildEntiteAdmin,
  createDirectionAdminLocal,
  createServiceAdminLocal,
  editDirectionServiceAdminLocal,
  editEntiteAdmin,
  getDirectionServiceAdminLocal,
  getDirectionsServicesList,
  getEditableEntitiesChain,
  getEntiteById,
  getEntiteDescendantIds,
  getEntites,
  getEntitesByIds,
  getEntitesListAdmin,
  getRootEntitesListAdmin,
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
    zValidator('query', GetEntitesListAdminQuerySchema),
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

  .get(
    '/admin/directions-services',
    roleMiddleware([ROLES.ENTITY_ADMIN]),
    adminLocalDirectionsServicesFeatureFlagMiddleware,
    getDirectionsServicesListRoute,
    async (c) => {
      const logger = c.get('logger');
      const assignedEntiteId = c.get('assignedEntiteId');
      const search = c.req.query('search') ?? '';

      logger.info({ assignedEntiteId, search }, 'Local directions and services list requested');

      if (!assignedEntiteId) {
        return c.json({
          data: [],
          capabilities: {
            canCreateDirection: false,
            canCreateService: false,
          },
          availableDirections: [],
        });
      }

      const result = await getDirectionsServicesList(assignedEntiteId, { search });
      logger.info({ rowsCount: result.data.length }, 'Local directions and services list retrieved successfully');

      return c.json(result);
    },
  )

  .get(
    '/admin/directions-services/:id',
    roleMiddleware([ROLES.ENTITY_ADMIN]),
    adminLocalDirectionsServicesFeatureFlagMiddleware,
    getDirectionServiceAdminLocalRoute,
    async (c) => {
      const assignedEntiteId = c.get('assignedEntiteId');
      const targetEntiteId = c.req.param('id');
      const logger = c.get('logger');

      const entite = assignedEntiteId ? await getDirectionServiceAdminLocal(assignedEntiteId, targetEntiteId) : null;

      if (!entite) {
        logger.warn({ assignedEntiteId, targetEntiteId }, 'Local Direction or Service edit target not found');
        throwHTTPException404NotFound('Entite not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
      }

      return c.json({ data: entite });
    },
  )

  .patch(
    '/admin/directions-services/:id',
    roleMiddleware([ROLES.ENTITY_ADMIN]),
    adminLocalDirectionsServicesFeatureFlagMiddleware,
    zValidator('json', EditDirectionServiceAdminLocalInputSchema),
    editDirectionServiceAdminLocalRoute,
    async (c) => {
      const assignedEntiteId = c.get('assignedEntiteId');
      const targetEntiteId = c.req.param('id');
      const data = c.req.valid('json');
      const logger = c.get('logger');
      const entite = assignedEntiteId
        ? await editDirectionServiceAdminLocal(assignedEntiteId, targetEntiteId, data)
        : null;

      if (!entite) {
        logger.warn({ assignedEntiteId, targetEntiteId }, 'Local Direction or Service edit target not found');
        throwHTTPException404NotFound('Entite not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
      }

      return c.json({ data: entite });
    },
  )

  .post(
    '/admin/directions-services/directions',
    roleMiddleware([ROLES.ENTITY_ADMIN]),
    adminLocalDirectionsServicesFeatureFlagMiddleware,
    zValidator('json', CreateDirectionAdminLocalInputSchema),
    createDirectionAdminLocalRoute,
    async (c) => {
      const assignedEntiteId = c.get('assignedEntiteId');
      const data = c.req.valid('json');
      const logger = c.get('logger');

      if (!assignedEntiteId) {
        throwHTTPException400BadRequest('Assigned entite is required to create a Direction', {
          res: c.res,
          kind: ERROR_KIND.BUSINESS,
        });
      }

      try {
        const entite = await createDirectionAdminLocal(assignedEntiteId, data);
        return c.json({ data: entite });
      } catch (error) {
        if (error instanceof EntiteNotFoundError) {
          logger.warn({ entiteId: assignedEntiteId }, 'Entite not found');
          throwHTTPException404NotFound('Entite not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
        }

        if (error instanceof EntiteChildCreationForbiddenError) {
          logger.warn(
            { entiteId: assignedEntiteId },
            'Local Direction creation is not allowed for this assigned entity',
          );
          throwHTTPException400BadRequest('Child entite creation is not allowed for this parent', {
            res: c.res,
            kind: ERROR_KIND.BUSINESS,
          });
        }

        throw error;
      }
    },
  )

  .post(
    '/admin/directions-services/services',
    roleMiddleware([ROLES.ENTITY_ADMIN]),
    adminLocalDirectionsServicesFeatureFlagMiddleware,
    zValidator('json', CreateServiceAdminLocalInputSchema),
    createServiceAdminLocalRoute,
    async (c) => {
      const assignedEntiteId = c.get('assignedEntiteId');
      const { parentDirectionId, ...data } = c.req.valid('json');

      if (!assignedEntiteId) {
        throwHTTPException400BadRequest('Assigned entite is required to create a Service', {
          res: c.res,
          kind: ERROR_KIND.BUSINESS,
        });
      }

      try {
        const entite = parentDirectionId
          ? await createServiceAdminLocal(assignedEntiteId, data, parentDirectionId)
          : await createServiceAdminLocal(assignedEntiteId, data);
        return c.json({ data: entite });
      } catch (error) {
        if (error instanceof EntiteChildCreationForbiddenError) {
          throwHTTPException400BadRequest('Child entite creation is not allowed for this parent', {
            res: c.res,
            kind: ERROR_KIND.BUSINESS,
          });
        }

        throw error;
      }
    },
  )

  .get('/admin/roots', roleMiddleware([ROLES.SUPER_ADMIN]), getRootEntitesListAdminRoute, async (c) => {
    const logger = c.get('logger');

    logger.info('Admin root entities list requested');
    const entites = await getRootEntitesListAdmin();
    logger.info({ entitiesCount: entites.length }, 'Admin root entities list retrieved successfully');

    return c.json({ data: entites });
  })

  .get('/admin/:id', roleMiddleware([ROLES.SUPER_ADMIN]), getEntiteByIdAdminRoute, async (c) => {
    const id = c.req.param('id');
    const logger = c.get('logger');

    const entite = await getEntiteById(id);

    if (!entite) {
      logger.warn({ entiteId: id }, 'Entite not found');
      throwHTTPException404NotFound('Entite not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
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
          throwHTTPException404NotFound('Entite not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
        }

        if (error instanceof EntiteChildCreationForbiddenError) {
          logger.warn({ entiteId: id }, 'Child entite creation is not allowed for this parent');
          throwHTTPException400BadRequest('Child entite creation is not allowed for this parent', {
            res: c.res,
            kind: ERROR_KIND.BUSINESS,
          });
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
          throwHTTPException404NotFound('Entite not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
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
