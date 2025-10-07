import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
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
import {
  addProcessingStepRoute,
  createRequeteRoute,
  getRequeteEntiteRoute,
  getRequetesEntiteRoute,
} from './requetesEntite.route';
import {
  AddProcessingStepBodySchema,
  CreateRequeteBodySchema,
  GetRequetesEntiteQuerySchema,
  UpdateDeclarantBodySchema,
  UpdateParticipantBodySchema,
} from './requetesEntite.schema';
import {
  createRequeteEntite,
  getRequeteEntiteById,
  getRequetesEntite,
  updateRequeteDeclarant,
  updateRequeteParticipant,
} from './requetesEntite.service';

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

  .get('/:id', getRequeteEntiteRoute, async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const entiteIds = c.get('entiteIds');

    const requeteEntite = await getRequeteEntiteById(id, entiteIds);

    if (!requeteEntite) {
      return throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    logger.info({ requeteId: id }, 'Requete details retrieved successfully');

    return c.json({ data: requeteEntite });
  })

  .get('/:id/processing-steps', async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const entiteIds = c.get('entiteIds');

    // TODO: Use real entiteIds when implemented
    // const hasAccess = await hasAccessToRequete({ requeteId: id, entiteId });
    const hasAccess = true;

    if (!hasAccess) {
      return throwHTTPException404NotFound('Requete entite not found', {
        res: c.res,
      });
    }

    const { data, total } = await getRequeteEtapes(id, entiteIds || [], {});

    logger.info({ requestId: id, stepCount: total }, 'Processing steps retrieved successfully');

    return c.json({ data, meta: { total } });
  })

  // Roles with edit permissions
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

  .post('/', createRequeteRoute, zValidator('json', CreateRequeteBodySchema), async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');
    const body = c.req.valid('json');

    const requete = await createRequeteEntite(entiteIds, body);

    logger.info({ requeteId: requete.id, userId, hasDeclarant: !!body.declarant }, 'New requete created successfully');

    return c.json({ data: requete }, 201);
  })

  .patch('/:id/declarant', zValidator('json', UpdateDeclarantBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');
    const { declarant: declarantData, controls } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, entiteIds);

    if (!requeteEntite) {
      return throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const updatedRequete = await updateRequeteDeclarant(id, declarantData, controls);

    logger.info({ requeteId: id, userId }, 'Declarant data updated successfully');

    return c.json({ data: updatedRequete });
  })

  .patch('/:id/participant', zValidator('json', UpdateParticipantBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');
    const { participant: participantData, controls } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, entiteIds);

    if (!requeteEntite) {
      return throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    try {
      const updatedRequete = await updateRequeteParticipant(id, participantData, controls);

      logger.info({ requeteId: id, userId }, 'Participant data updated successfully');

      return c.json({ data: updatedRequete });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith('CONFLICT')) {
        const conflictResponse = {
          message: 'The participant identity has been modified by another user.',
          conflictData: (error as Error & { conflictData?: unknown }).conflictData || null,
        };

        return c.json(conflictResponse, 409);
      }
      throw error;
    }
  })

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
      const entiteIds = c.get('entiteIds');

      // TODO: Use real entiteIds when implemented
      // const hasAccess = await hasAccessToRequete(id, null);
      const hasAccess = true;

      if (!hasAccess) {
        return throwHTTPException404NotFound('Requete entite not found', {
          res: c.res,
        });
      }

      const step = await addProcessingEtape(id, entiteIds || [], {
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
