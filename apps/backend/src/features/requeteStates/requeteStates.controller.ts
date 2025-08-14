import { throwHTTPException401Unauthorized, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getRequeteStateById, updateRequeteStateStatut } from '@/features/requeteStates/requeteStates.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteStatesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteStep.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service';
import { updateRequeteStateStatutRoute } from './requeteStates.route';
import { UpdateRequeteStateStatutSchema } from './requeteStates.schema';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))
  .use(entitesMiddleware)

  .patch(
    '/:id/statut',
    updateRequeteStateStatutRoute,
    zValidator('json', UpdateRequeteStateStatutSchema),
    requeteStatesChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const body = c.req.valid('json');
      const userId = c.get('userId');

      const requeteState = await getRequeteStateById(id);

      if (!requeteState) {
        return throwHTTPException404NotFound('RequeteState not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      //   const entiteIds = c.get('entiteIds');
      const hasAccess = await hasAccessToRequete(requeteState.requeteEntiteId, null);
      if (!hasAccess) {
        return throwHTTPException401Unauthorized('You are not allowed to update this requete state', {
          res: c.res,
        });
      }

      const updatedRequeteState = await updateRequeteStateStatut(id, {
        statutId: body.statutId,
      });

      if (!updatedRequeteState) {
        return throwHTTPException404NotFound('RequeteState not found', {
          res: c.res,
        });
      }

      c.set('changelogId', updatedRequeteState.id);

      logger.info(
        {
          requeteStateId: id,
          oldStatutId: requeteState.statutId,
          newStatutId: body.statutId,
          userId,
        },
        'RequeteState statut updated successfully',
      );

      return c.json({ data: updatedRequeteState });
    },
  );

export default app;
