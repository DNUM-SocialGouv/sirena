import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import { addProcessingStepRoute, getRequetesEntiteRoute } from './requetesEntite.route';
import { AddProcessingStepBodySchema, GetRequetesEntiteQuerySchema } from './requetesEntite.schema';
import { addProcessingStep, getProcessingSteps, getRequetesEntite } from './requetesEntite.service';

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

  .post('/:id/processing-steps', addProcessingStepRoute, zValidator('json', AddProcessingStepBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const userId = c.get('userId');

    const step = await addProcessingStep(id, body, null);

    logger.info({ requestId: id, stepId: step.id, userId }, 'Processing step added successfully');

    return c.json(step, 201);
  })

  .get('/:id/processing-steps', async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();

    const steps = await getProcessingSteps(id);

    logger.info({ requestId: id, stepCount: steps.length }, 'Processing steps retrieved successfully');

    return c.json(steps);
  });

export default app;
