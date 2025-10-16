import {
  throwHTTPException401Unauthorized,
  throwHTTPException403Forbidden,
  throwHTTPException404NotFound,
} from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import {
  addProcessingEtape,
  deleteRequeteEtape,
  getRequeteEtapeById,
  getRequeteEtapes,
  updateRequeteEtapeNom,
  updateRequeteEtapeStatut,
} from '@/features/requeteEtapes/requetesEtapes.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteEtapesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteEtape.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { addProcessingStepRoute } from '../requetesEntite/requetesEntite.route';
import { AddProcessingStepBodySchema } from '../requetesEntite/requetesEntite.schema';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service';
import { getUserById } from '../users/users.service';
import {
  deleteRequeteEtapeRoute,
  updateRequeteEtapeNomRoute,
  updateRequeteEtapeStatutRoute,
} from './requetesEtapes.route';
import { UpdateRequeteEtapeNomSchema, UpdateRequeteEtapeStatutSchema } from './requetesEtapes.schema';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER, ROLES.READER]))
  .use(userStatusMiddleware)
  .use(entitesMiddleware)

  .get('/:id/processing-steps', async (c) => {
    const logger = c.get('logger');
    const { id: requeteId } = c.req.param();
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

    const { data, total } = await getRequeteEtapes(requeteId, [user.entiteId], {});

    logger.info({ requestId: requeteId, stepCount: total }, 'Processing steps retrieved successfully');

    return c.json({ data, meta: { total } });
  })

  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

  .post(
    '/:id/processing-steps',
    addProcessingStepRoute,
    zValidator('json', AddProcessingStepBodySchema),
    requeteEtapesChangelogMiddleware({ action: ChangeLogAction.CREATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id: requeteId } = c.req.param();
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
      const step = await addProcessingEtape(requeteId, [user.entiteId], {
        nom: body.nom,
      });

      if (!step) {
        logger.error({ requestId: requeteId, userId }, 'Inconsistent state: step not created');
        return throwHTTPException404NotFound('Requete entite not found', {
          res: c.res,
        });
      }

      c.set('changelogId', step.id);

      logger.info({ requestId: requeteId, stepId: step.id, userId }, 'Processing step added successfully');

      return c.json({ data: step }, 201);
    },
  )
  .patch(
    '/:id/statut',
    updateRequeteEtapeStatutRoute,
    zValidator('json', UpdateRequeteEtapeStatutSchema),
    requeteEtapesChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const body = c.req.valid('json');
      const userId = c.get('userId');

      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      //   const entiteIds = c.get('entiteIds');
      const hasAccess = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: requeteEtape.entiteId,
      });
      if (!hasAccess) {
        return throwHTTPException403Forbidden('You are not allowed to update this requete etape', {
          res: c.res,
        });
      }

      const updatedRequeteEtape = await updateRequeteEtapeStatut(id, {
        statutId: body.statutId,
      });

      if (!updatedRequeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', {
          res: c.res,
        });
      }

      c.set('changelogId', updatedRequeteEtape.id);

      logger.info(
        {
          requeteEtapeId: id,
          oldStatutId: requeteEtape.statutId,
          newStatutId: body.statutId,
          userId,
        },
        'RequeteEtape statut updated successfully',
      );

      return c.json({ data: updatedRequeteEtape });
    },
  )

  .patch(
    '/:id/nom',
    updateRequeteEtapeNomRoute,
    zValidator('json', UpdateRequeteEtapeNomSchema),
    requeteEtapesChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const body = c.req.valid('json');
      const userId = c.get('userId');

      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      //   const entiteIds = c.get('entiteIds');
      const hasAccess = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: requeteEtape.entiteId,
      });
      if (!hasAccess) {
        return throwHTTPException401Unauthorized('You are not allowed to update this requete etape', {
          res: c.res,
        });
      }

      const updatedRequeteEtape = await updateRequeteEtapeNom(id, {
        nom: body.nom,
      });

      if (!updatedRequeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', {
          res: c.res,
        });
      }

      c.set('changelogId', updatedRequeteEtape.id);

      logger.info(
        {
          requeteEtapeId: id,
          oldNom: requeteEtape.nom,
          newNom: body.nom,
          userId,
        },
        'RequeteEtape nom updated successfully',
      );

      return c.json({ data: updatedRequeteEtape });
    },
  )

  .delete(
    '/:id',
    deleteRequeteEtapeRoute,
    requeteEtapesChangelogMiddleware({ action: ChangeLogAction.DELETED }),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const userId = c.get('userId');

      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      //   const entiteIds = c.get('entiteIds');
      const hasAccess = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: requeteEtape.entiteId,
      });
      if (!hasAccess) {
        return throwHTTPException403Forbidden('You are not allowed to delete this requete etape', {
          res: c.res,
        });
      }

      await deleteRequeteEtape(id, logger, userId);

      logger.info({ requeteEtapeId: id, userId }, 'RequeteEtape deleted successfully');
      return c.body(null, 204);
    },
  );

export default app;
