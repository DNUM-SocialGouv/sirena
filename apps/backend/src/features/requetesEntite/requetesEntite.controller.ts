import { throwHTTPException401Unauthorized, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { addProcessingEtape, getRequeteEtapes } from '@/features/requeteEtapes/requetesEtapes.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteStatesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteEtape.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { getUserById } from '../users/users.service';
import { addProcessingStepRoute, getRequetesEntiteRoute } from './requetesEntite.route';
import { AddProcessingStepBodySchema, GetRequetesEntiteQuerySchema } from './requetesEntite.schema';
import { getRequetesEntite } from './requetesEntite.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]))
  .use(entitesMiddleware)

  .get('/', getRequetesEntiteRoute, zValidator('query', GetRequetesEntiteQuerySchema), async (c) => {
    const logger = c.get('logger');
    const query = c.req.valid('query');
    // const entiteIds = c.get('entiteIds');
    // TODO Use real entiteIds when implemented
    const { data, total } = await getRequetesEntite(null, query);

    logger.info({ requestCount: data.length, total }, 'Requetes entite list retrieved successfully');

    return c.json({
      data,
      meta: {
        ...(query.offset !== undefined && { offset: query.offset }),
        ...(query.limit !== undefined && { limit: query.limit }),
        total,
      },
    });
  })

  // TODO: Processing steps returns RequeteEtapes entity and should be in a dedicated RequeteEtapes controller
  .get('/:id/processing-steps', async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    // const entiteIds = c.get('entiteIds');

    // TODO: Use real entiteIds when implemented
    // const hasAccess = await hasAccessToRequete({ requeteId: id, entiteId });
    const hasAccess = true;

    if (!hasAccess) {
      return throwHTTPException404NotFound('Requete entite not found', {
        res: c.res,
      });
    }

    // TODO: Temporary: Here we are using a permission and access management system that will not be the final system: HERE only the user's entiteId is used to retrieve the steps linked to this same entiteId, it WILL likely be more complex later with a parent/child permission chain.
    const userId = c.get('userId');
    const user = await getUserById(userId, null, null);
    if (!user?.entiteId) {
      return throwHTTPException401Unauthorized('User not found', {
        res: c.res,
      });
    }

    const { data, total } = await getRequeteEtapes(id, user.entiteId, {});

    logger.info({ requestId: id, stepCount: total }, 'Processing steps retrieved successfully');

    return c.json({ data, meta: { total } });
  })

  // Roles with edit permissions
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

  // TODO: Processing steps create RequeteEtape entity and should be in a dedicated RequeteEtapes controller
  .post(
    '/:id/processing-steps',
    addProcessingStepRoute,
    zValidator('json', AddProcessingStepBodySchema),
    requeteStatesChangelogMiddleware({ action: ChangeLogAction.CREATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const body = c.req.valid('json');
      const userId = c.get('userId');
      // const entiteIds = c.get('entiteIds');

      // TODO: Use real entiteIds when implemented
      // const hasAccess = await hasAccessToRequete(id, null);
      const hasAccess = true;

      if (!hasAccess) {
        return throwHTTPException404NotFound('Requete entite not found', {
          res: c.res,
        });
      }

      // TODO: Temporary: Here we are using a permission and access management system that will not be the final system: HERE only the user's entiteId is used to create the step linked to this same entiteId, it WILL likely be more complex later with maybe a parent/child permission chain.
      const user = await getUserById(userId, null, null);
      if (!user?.entiteId) {
        return throwHTTPException401Unauthorized('User not found', {
          res: c.res,
        });
      }
      const step = await addProcessingEtape(id, user.entiteId, {
        nom: body.nom,
      });

      if (!step) {
        logger.error({ requestId: id, userId }, 'Inconsistent state: step not created');
        return throwHTTPException404NotFound('Requete entite not found', {
          res: c.res,
        });
      }

      c.set('changelogId', step.id);

      logger.info({ requestId: id, stepId: step.id, userId }, 'Processing step added successfully');

      return c.json({ data: step }, 201);
    },
  );

export default app;
