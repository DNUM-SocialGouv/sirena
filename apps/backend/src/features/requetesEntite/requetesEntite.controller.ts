import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import { addProcessingState, getRequeteStates } from '@/features/requeteStates/requeteStates.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import { addProcessingStepRoute, getRequetesEntiteRoute } from './requetesEntite.route';
import { AddProcessingStepBodySchema, GetRequetesEntiteQuerySchema } from './requetesEntite.schema';
import { getRequetesEntite, hasAccessToRequete } from './requetesEntite.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
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

  .get('/:id/processing-steps', async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    // const entiteIds = c.get('entiteIds');

    // TODO Use real entiteIds when implemented
    const hasAccess = await hasAccessToRequete(id, null);

    if (!hasAccess) {
      return throwHTTPException404NotFound('Requete entite not found', {
        res: c.res,
      });
    }

    const { data, total } = await getRequeteStates(id, {});

    logger.info({ requestId: id, stepCount: total }, 'Processing steps retrieved successfully');

    return c.json({ data, meta: { total } });
  })

  // Roles with edit permissions
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

  .post('/:id/processing-steps', addProcessingStepRoute, zValidator('json', AddProcessingStepBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const userId = c.get('userId');
    // const entiteIds = c.get('entiteIds');

    // TODO Use real entiteIds when implemented
    const hasAccess = await hasAccessToRequete(id, null);

    if (!hasAccess) {
      return throwHTTPException404NotFound('Requete entite not found', {
        res: c.res,
      });
    }

    const step = await addProcessingState(id, {
      stepName: body.stepName,
    });

    if (!step) {
      logger.error({ requestId: id, userId }, 'Inconsistent state: step not created');
      return throwHTTPException404NotFound('Requete entite not found', {
        res: c.res,
      });
    }

    logger.info({ requestId: id, stepId: step.id, userId }, 'Processing step added successfully');

    return c.json({ data: step }, 201);
  });

export default app;
