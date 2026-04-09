import {
  throwHTTPException400BadRequest,
  throwHTTPException403Forbidden,
  throwHTTPException404NotFound,
  throwHTTPException409Conflict,
} from '@sirena/backend-utils/helpers';
import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, REQUETE_STATUT_TYPES, ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { streamFileResponse, streamSafeFileResponse } from '../../helpers/file.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import requeteEtapesChangelogMiddleware from '../../middlewares/changelog/changelog.requeteEtape.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import {
  buildAcknowledgmentMessageText,
  sendManualAcknowledgmentEmail,
} from '../declarants/declarants.notification.service.js';
import { getEntitesByRequeteId } from '../entites/entites.service.js';
import {
  getRequeteEntiteById,
  hasAccessToRequete,
  updateStatusRequete,
} from '../requetesEntite/requetesEntite.service.js';
import { getUploadedFileById } from '../uploadedFiles/uploadedFiles.service.js';
import {
  addProcessingStepRoute,
  deleteRequeteEtapeRoute,
  sendAcknowledgmentRoute,
  updateRequeteEtapeNomRoute,
  updateRequeteEtapeStatutRoute,
} from './requetesEtapes.route.js';
import {
  AddProcessingStepBodySchema,
  SendAcknowledgmentBodySchema,
  UpdateRequeteEtapeNomSchema,
  UpdateRequeteEtapeStatutSchema,
} from './requetesEtapes.schema.js';
import {
  addProcessingEtape,
  deleteRequeteEtape,
  getRequeteEtapeById,
  getRequeteEtapes,
  updateRequeteEtapeNom,
  updateRequeteEtapeStatut,
} from './requetesEtapes.service.js';

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

      const hasAccess = await hasAccessToRequete({
        requeteId,
        entiteId: topEntiteId,
      });

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

      const requete = await getRequeteEntiteById(requeteEtape.requeteId, topEntiteId);

      if (requete?.statutId === REQUETE_STATUT_TYPES.NOUVEAU) {
        await updateStatusRequete(requeteEtape.requeteId, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
      }

      await deleteRequeteEtape(id, logger, userId);

      logger.info({ requeteEtapeId: id, userId }, 'RequeteEtape deleted successfully');
      return c.body(null, 204);
    },
  )

  .get('/:id/acknowledgment-message', async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const topEntiteId = c.get('topEntiteId');

    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', { res: c.res });
    }

    const requeteEtape = await getRequeteEtapeById(id);
    if (!requeteEtape) {
      throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
    }

    if (topEntiteId !== requeteEtape.entiteId) {
      throwHTTPException403Forbidden('You are not allowed to access this requete etape', { res: c.res });
    }

    const hasAccessToReq = await hasAccessToRequete({
      requeteId: requeteEtape.requeteId,
      entiteId: topEntiteId,
    });
    if (!hasAccessToReq) {
      throwHTTPException403Forbidden('You are not allowed to access this requete', { res: c.res });
    }

    const entites = await getEntitesByRequeteId(requeteEtape.requeteId);
    const message = buildAcknowledgmentMessageText(requeteEtape.requeteId, entites);

    const requete = await getRequeteEntiteById(requeteEtape.requeteId, topEntiteId);
    const declarantEmail = requete?.requete?.declarant?.identite?.email ?? null;

    logger.info({ requeteEtapeId: id }, 'Acknowledgment message preview fetched');

    return c.json({ data: { message, declarantEmail } });
  })

  .post(
    '/:id/send-acknowledgment',
    sendAcknowledgmentRoute,
    zValidator('json', SendAcknowledgmentBodySchema),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const body = c.req.valid('json');
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');

      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to perform this action without topEntiteId.', {
          res: c.res,
        });
      }

      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      if (topEntiteId !== requeteEtape.entiteId) {
        throwHTTPException403Forbidden('You are not allowed to act on this requete etape', { res: c.res });
      }

      const hasAccessToReq = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: topEntiteId,
      });

      if (!hasAccessToReq) {
        throwHTTPException403Forbidden('You are not allowed to access this requete', { res: c.res });
      }

      if (requeteEtape.type !== REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT) {
        throwHTTPException400BadRequest("Cette étape n'est pas une étape d'accusé de réception.", { res: c.res });
      }

      if (requeteEtape.statutId !== REQUETE_ETAPE_STATUT_TYPES.A_FAIRE) {
        throwHTTPException409Conflict("L'accusé de réception a déjà été envoyé pour cette étape.", { res: c.res });
      }

      const requeteForEmail = await getRequeteEntiteById(requeteEtape.requeteId, topEntiteId);
      if (!requeteForEmail?.requete?.declarant?.identite?.email) {
        throwHTTPException400BadRequest(
          "Le déclarant n'a pas d'adresse e-mail renseignée. Veuillez la renseigner avant d'envoyer l'accusé de réception.",
          { res: c.res },
        );
      }

      try {
        await sendManualAcknowledgmentEmail({
          etapeId: id,
          requeteId: requeteEtape.requeteId,
          entiteId: topEntiteId,
          userId,
          comment: body.comment,
        });
      } catch (error) {
        if (error instanceof Error && (error as unknown as { code: string }).code === 'STEP_ALREADY_PROCESSED') {
          throwHTTPException409Conflict("L'accusé de réception a déjà été envoyé pour cette étape.", { res: c.res });
        }
        throw error;
      }

      const updatedEtape = await getRequeteEtapeById(id);

      logger.info({ requeteEtapeId: id, userId }, 'Manual acknowledgment email sent successfully');

      return c.json({ data: updatedEtape });
    },
  );

export default app;
