import {
  throwHTTPException400BadRequest,
  throwHTTPException403Forbidden,
  throwHTTPException404NotFound,
} from '@sirena/backend-utils/helpers';
import { REQUETE_STATUT_TYPES, ROLES } from '@sirena/common/constants';
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
import { streamFileResponse, streamSafeFileResponse } from '@/helpers/file';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteEtapesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteEtape.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import {
  getRequeteEntiteById,
  hasAccessToRequete,
  updateStatusRequete,
} from '../requetesEntite/requetesEntite.service';
import { getUploadedFileById } from '../uploadedFiles/uploadedFiles.service';
import {
  addProcessingStepRoute,
  deleteRequeteEtapeRoute,
  updateRequeteEtapeNomRoute,
  updateRequeteEtapeStatutRoute,
} from './requetesEtapes.route';
import {
  AddProcessingStepBodySchema,
  UpdateRequeteEtapeNomSchema,
  UpdateRequeteEtapeStatutSchema,
} from './requetesEtapes.schema';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER, ROLES.READER]))
  .use(userStatusMiddleware)
  .use(entitesMiddleware)

  .get('/:id/processing-steps', async (c) => {
    const logger = c.get('logger');
    const { id: requeteId } = c.req.param();
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
        res: c.res,
      });
    }

    const { data, total } = await getRequeteEtapes(requeteId, topEntiteId, {});

    logger.info({ requestId: requeteId, stepCount: total }, 'Processing steps retrieved successfully');

    return c.json({ data, meta: { total } });
  })
  .get('/:id/file/:fileId', async (c) => {
    const logger = c.get('logger');
    const { id, fileId } = c.req.param();
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
        res: c.res,
      });
    }

    const requeteEtape = await getRequeteEtapeById(id);

    if (!requeteEtape) {
      throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
    }

    if (topEntiteId !== requeteEtape.entiteId) {
      throwHTTPException403Forbidden('You are not allowed to read this file for this requete etape', {
        res: c.res,
      });
    }

    const hasAccessToReq = await hasAccessToRequete({
      requeteId: requeteEtape.requeteId,
      entiteId: topEntiteId,
    });

    if (!hasAccessToReq) {
      throwHTTPException403Forbidden('You are not allowed to add notes to this requete etape', {
        res: c.res,
      });
    }

    const file = await getUploadedFileById(fileId, [topEntiteId]);

    if (!file) {
      throwHTTPException404NotFound('File not found', { res: c.res });
    }

    logger.info({ requeteEtapeId: id, fileId }, 'Retrieving file for requete etape');

    return streamFileResponse(c, file);
  })
  .get('/:id/file/:fileId/safe', async (c) => {
    const logger = c.get('logger');
    const { id, fileId } = c.req.param();
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
        res: c.res,
      });
    }

    const requeteEtape = await getRequeteEtapeById(id);

    if (!requeteEtape) {
      throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
    }

    if (topEntiteId !== requeteEtape.entiteId) {
      throwHTTPException403Forbidden('You are not allowed to read this file for this requete etape', {
        res: c.res,
      });
    }

    const hasAccessToReq = await hasAccessToRequete({
      requeteId: requeteEtape.requeteId,
      entiteId: topEntiteId,
    });

    if (!hasAccessToReq) {
      throwHTTPException403Forbidden('You are not allowed to access this file', {
        res: c.res,
      });
    }

    const file = await getUploadedFileById(fileId, [topEntiteId]);

    if (!file) {
      throwHTTPException404NotFound('File not found', { res: c.res });
    }

    if (!file.safeFilePath) {
      throwHTTPException404NotFound('Safe file not available', { res: c.res });
    }

    logger.info({ requeteEtapeId: id, fileId }, 'Retrieving safe file for requete etape');

    return streamSafeFileResponse(c, file);
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
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
          res: c.res,
        });
      }

      const hasAccess = await hasAccessToRequete({ requeteId, entiteId: topEntiteId });

      if (!hasAccess) {
        throwHTTPException404NotFound('Requete entite not found', {
          res: c.res,
        });
      }

      const requete = await getRequeteEntiteById(requeteId, topEntiteId);

      if (requete?.statutId === REQUETE_STATUT_TYPES.NOUVEAU) {
        await updateStatusRequete(requeteId, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
      }

      const step = await addProcessingEtape(
        requeteId,
        topEntiteId,
        {
          nom: body.nom,
        },
        userId,
      );

      if (!step) {
        logger.error({ requestId: requeteId, userId }, 'Inconsistent state: step not created');
        throwHTTPException404NotFound('Requete entite not found', {
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
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
          res: c.res,
        });
      }
      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      const hasAccessToReq = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: topEntiteId,
      });

      if (!hasAccessToReq) {
        throwHTTPException403Forbidden('You are not allowed to add notes to this requete etape', {
          res: c.res,
        });
      }

      if (topEntiteId !== requeteEtape.entiteId) {
        throwHTTPException403Forbidden('You are not allowed to update this requete etape', {
          res: c.res,
        });
      }

      const requete = await getRequeteEntiteById(requeteEtape.requeteId, topEntiteId);

      if (requete?.statutId === REQUETE_STATUT_TYPES.NOUVEAU) {
        await updateStatusRequete(requeteEtape.requeteId, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
      }

      const updatedRequeteEtape = await updateRequeteEtapeStatut(id, {
        statutId: body.statutId,
      });

      if (!updatedRequeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', {
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

      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
          res: c.res,
        });
      }
      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }
      const hasAccessToReq = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: topEntiteId,
      });

      if (!hasAccessToReq) {
        throwHTTPException403Forbidden('You are not allowed to add notes to this requete etape', {
          res: c.res,
        });
      }

      if (topEntiteId !== requeteEtape.entiteId) {
        throwHTTPException403Forbidden('You are not allowed to update this requete etape', {
          res: c.res,
        });
      }

      const requete = await getRequeteEntiteById(requeteEtape.requeteId, topEntiteId);

      if (requete?.statutId === REQUETE_STATUT_TYPES.NOUVEAU) {
        await updateStatusRequete(requeteEtape.requeteId, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
      }

      const updatedRequeteEtape = await updateRequeteEtapeNom(id, {
        nom: body.nom,
      });

      if (!updatedRequeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', {
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
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
          res: c.res,
        });
      }
      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      const hasAccessToReq = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: topEntiteId,
      });

      if (!hasAccessToReq) {
        throwHTTPException403Forbidden('You are not allowed to add notes to this requete etape', {
          res: c.res,
        });
      }

      if (topEntiteId !== requeteEtape.entiteId) {
        throwHTTPException403Forbidden('You are not allowed to delete this requete etape', {
          res: c.res,
        });
      }

      await deleteRequeteEtape(id, logger, userId);

      logger.info({ requeteEtapeId: id, userId }, 'RequeteEtape deleted successfully');
      return c.body(null, 204);
    },
  );

export default app;
