import * as Sentry from '@sentry/node';
import {
  throwHTTPException400BadRequest,
  throwHTTPException403Forbidden,
  throwHTTPException404NotFound,
} from '@sirena/backend-utils/helpers';
import {
  RECEPTION_TYPE,
  REQUETE_STATUT_TYPES,
  REQUETE_UPDATE_FIELDS,
  ROLES_READ,
  ROLES_WRITE,
} from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import {
  getUploadedFileById,
  isFileBelongsToRequete,
  isUserOwner,
  setRequeteFile,
} from '@/features/uploadedFiles/uploadedFiles.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { streamFileResponse, streamSafeFileResponse } from '@/helpers/file';
import { sseEventManager } from '@/helpers/sse';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteChangelogMiddleware from '@/middlewares/changelog/changelog.requete.middleware';
import requeteStatesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteEtape.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { getDirectionsServicesFromRequeteEntiteId } from '../entites/entites.service';
import { updateDateAndTypeRequete } from '../requetes/requetes.service';
import {
  closeRequeteRoute,
  createRequeteRoute,
  getOtherEntitesAffectedRoute,
  getRequeteEntiteRoute,
  getRequetesEntiteRoute,
} from './requetesEntite.route';
import {
  CloseRequeteBodySchema,
  CreateRequeteBodySchema,
  GetRequetesEntiteQuerySchema,
  UpdateDeclarantBodySchema,
  UpdateParticipantBodySchema,
  UpdatePrioriteBodySchema,
  UpdateRequeteFilesBodySchema,
  UpdateSituationBodySchema,
  UpdateTypeAndDateRequeteBodySchema,
} from './requetesEntite.schema';
import {
  closeRequeteForEntite,
  createRequeteEntite,
  createRequeteSituation,
  getOtherEntitesAffected,
  getRequeteEntiteById,
  getRequetesEntite,
  hasAccessToRequete,
  updatePrioriteRequete,
  updateRequeteDeclarant,
  updateRequeteParticipant,
  updateRequeteSituation,
  updateStatusRequete,
} from './requetesEntite.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([...ROLES_READ]))
  .use(entitesMiddleware)

  .get('/', getRequetesEntiteRoute, zValidator('query', GetRequetesEntiteQuerySchema), async (c) => {
    const logger = c.get('logger');
    const query = c.req.valid('query');
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
        res: c.res,
      });
    }
    const { data, total } = await getRequetesEntite([topEntiteId], query);

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
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
        res: c.res,
      });
    }

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    logger.info({ requeteId: id }, 'Requete details retrieved successfully');

    return c.json({ data: requeteEntite });
  })

  .get('/:id/other-entites-affected', getOtherEntitesAffectedRoute, async (c) => {
    const { id } = c.req.param();
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
        res: c.res,
      });
    }

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const [otherEntites, subAdministrativeEntites] = await Promise.all([
      getOtherEntitesAffected(requeteEntite.requeteId, requeteEntite.entiteId),
      getDirectionsServicesFromRequeteEntiteId(requeteEntite.requeteId, requeteEntite.entiteId),
    ]);

    return c.json({
      data: {
        otherEntites,
        subAdministrativeEntites,
      },
    });
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

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const file = await getUploadedFileById(fileId, [topEntiteId]);

    if (!file) {
      throwHTTPException404NotFound('File not found', { res: c.res });
    }

    const belongsToRequete = await isFileBelongsToRequete(fileId, id);

    if (!belongsToRequete) {
      logger.warn({ requeteId: id, fileId }, 'Attempt to access file not belonging to requete');
      throwHTTPException403Forbidden('File does not belong to this requete', { res: c.res });
    }

    logger.info({ requeteId: id, fileId }, 'Retrieving file for requete');

    return streamFileResponse(c, file);
  })
  .get('/:id/file/:fileId/safe', async (c) => {
    const logger = c.get('logger');
    const { id, fileId } = c.req.param();
    const topEntiteId = c.get('topEntiteId') as string;

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
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

    const belongsToRequete = await isFileBelongsToRequete(fileId, id);

    if (!belongsToRequete) {
      logger.warn({ requeteId: id, fileId }, 'Attempt to access safe file not belonging to requete');
      throwHTTPException403Forbidden('File does not belong to this requete', { res: c.res });
    }

    logger.info({ requeteId: id, fileId }, 'Retrieving safe file for requete');

    return streamSafeFileResponse(c, file);
  })
  .get('/:id/situation/:situationId/file/:fileId', async (c) => {
    const logger = c.get('logger');
    const { id, situationId, fileId } = c.req.param();
    const topEntiteId = c.get('topEntiteId') as string;

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete entite not found', { res: c.res });
    }

    const situation = requeteEntite.requete?.situations?.find((s) => s.id === situationId);

    if (!situation) {
      logger.warn({ requeteId: id, situationId }, 'Situation not found in requete');
      throwHTTPException404NotFound('Situation not found', { res: c.res });
    }

    const file = await getUploadedFileById(fileId, [topEntiteId]);
    if (!file) {
      throwHTTPException404NotFound('File not found', { res: c.res });
    }

    const belongsToRequete = await isFileBelongsToRequete(fileId, id);

    if (!belongsToRequete) {
      logger.warn({ requeteId: id, situationId, fileId }, 'Attempt to access file not belonging to requete');
      throwHTTPException403Forbidden('File does not belong to this requete', { res: c.res });
    }

    logger.info({ requeteId: id, situationId, fileId }, 'Retrieving file for situation');

    return streamFileResponse(c, file);
  })

  .use(roleMiddleware([...ROLES_WRITE]))

  .post(
    '/',
    createRequeteRoute,
    zValidator('json', CreateRequeteBodySchema),
    requeteChangelogMiddleware({ action: ChangeLogAction.CREATED }),
    async (c) => {
      const logger = c.get('logger');
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');
      const body = c.req.valid('json');
      const fileIds = body.fileIds || [];

      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to create requetes without topEntiteId.', {
          res: c.res,
        });
      }

      if (fileIds.length > 0) {
        const isAllowed = await isUserOwner(userId, fileIds);

        if (!isAllowed) {
          throwHTTPException403Forbidden('You are not allowed to add these files to the requete', {
            res: c.res,
          });
        }
      }

      const requete = await createRequeteEntite(topEntiteId, body, userId);

      if (fileIds.length > 0) {
        await setRequeteFile(requete.id, fileIds, topEntiteId);
        logger.info({ requeteId: requete.id, fileIds }, 'Files linked to requete successfully');
      }

      c.set('changelogId', requete.id);

      sseEventManager.emitRequeteUpdated({
        requeteId: requete.id,
        entiteId: topEntiteId,
        field: REQUETE_UPDATE_FIELDS.CREATED,
      });

      logger.info(
        {
          requeteId: requete.id,
          userId,
          hasDeclarant: !!body.declarant,
          hasParticipant: !!body.participant,
          fileCount: fileIds.length,
        },
        'New requete created successfully',
      );

      return c.json({ data: requete }, 201);
    },
  )

  .patch(
    '/:id/declarant',
    zValidator('json', UpdateDeclarantBodySchema),
    requeteChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to update requetes without topEntiteId.', {
          res: c.res,
        });
      }
      const { declarant: declarantData, controls } = c.req.valid('json');

      const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

      if (!requeteEntite) {
        throwHTTPException404NotFound('Requete not found', {
          res: c.res,
        });
      }

      const updatedRequete = await updateRequeteDeclarant(id, declarantData, controls);

      if (updatedRequete.declarant) {
        c.set('changelogId', updatedRequete.declarant.id);
      }

      sseEventManager.emitRequeteUpdated({
        requeteId: id,
        entiteId: topEntiteId,
        field: REQUETE_UPDATE_FIELDS.DECLARANT,
      });

      if (requeteEntite.statutId !== REQUETE_STATUT_TYPES.EN_COURS) {
        await updateStatusRequete(id, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
      }

      logger.info({ requeteId: id, userId }, 'Declarant data updated successfully');

      return c.json({ data: updatedRequete });
    },
  )

  .patch(
    '/:id/participant',
    zValidator('json', UpdateParticipantBodySchema),
    requeteChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to update requetes without topEntiteId.', {
          res: c.res,
        });
      }
      const { participant: participantData, controls } = c.req.valid('json');

      const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

      if (!requeteEntite) {
        throwHTTPException404NotFound('Requete not found', {
          res: c.res,
        });
      }

      try {
        const updatedRequete = await updateRequeteParticipant(id, participantData, controls);

        if (updatedRequete.participant) {
          c.set('changelogId', updatedRequete.participant.id);
        }

        sseEventManager.emitRequeteUpdated({
          requeteId: id,
          entiteId: topEntiteId,
          field: REQUETE_UPDATE_FIELDS.PARTICIPANT,
        });

        if (requeteEntite.statutId !== REQUETE_STATUT_TYPES.EN_COURS) {
          await updateStatusRequete(id, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
        }

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
    },
  )

  .patch('/:id/date-type', zValidator('json', UpdateTypeAndDateRequeteBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const userId = c.get('userId');
    const topEntiteId = c.get('topEntiteId');

    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to update requetes without topEntiteId.', {
        res: c.res,
      });
    }
    const { receptionDate, receptionTypeId, controls } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    if (requeteEntite.requete.receptionTypeId === RECEPTION_TYPE.FORMULAIRE) {
      throwHTTPException400BadRequest('You are not allowed to update requetes from formulaire.', {
        res: c.res,
      });
    }

    const payload: { receptionDate?: Date | null; receptionTypeId?: string | null } = {};

    if (receptionDate !== undefined) {
      payload.receptionDate = receptionDate ? new Date(receptionDate) : null;
    }

    if (receptionTypeId !== undefined) {
      payload.receptionTypeId = receptionTypeId;
    }

    try {
      const updatedRequete = await updateDateAndTypeRequete(id, payload, controls);

      sseEventManager.emitRequeteUpdated({
        requeteId: id,
        entiteId: topEntiteId,
        field: REQUETE_UPDATE_FIELDS.DATE_TYPE,
      });

      if (requeteEntite.statutId !== REQUETE_STATUT_TYPES.EN_COURS) {
        await updateStatusRequete(id, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
      }

      logger.info({ requeteId: id, userId }, 'Reception date and type updated successfully');

      return c.json({ data: updatedRequete });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith('CONFLICT')) {
        const conflictResponse = {
          message: 'The requete has been modified by another user.',
          conflictData: (error as Error & { conflictData?: unknown }).conflictData || null,
        };

        return c.json(conflictResponse, 409);
      }

      throw error;
    }
  })

  .patch('/:id/files', zValidator('json', UpdateRequeteFilesBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const userId = c.get('userId');
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to update requetes without topEntiteId.', {
        res: c.res,
      });
    }
    const { fileIds } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const isAllowed = await isUserOwner(userId, fileIds);

    if (!isAllowed) {
      throwHTTPException403Forbidden('You are not allowed to add these files to the requete', {
        res: c.res,
      });
    }

    await setRequeteFile(id, fileIds, topEntiteId);

    sseEventManager.emitRequeteUpdated({
      requeteId: id,
      entiteId: topEntiteId,
      field: REQUETE_UPDATE_FIELDS.FILES,
    });

    if (requeteEntite.statutId !== REQUETE_STATUT_TYPES.EN_COURS) {
      await updateStatusRequete(id, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
    }

    logger.info({ requeteId: id, userId, fileIds }, 'Files linked to requete successfully');

    return c.json({ data: { requeteId: id, fileIds } });
  })

  .patch('/:id/priorite', zValidator('json', UpdatePrioriteBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const userId = c.get('userId');
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to update requetes without topEntiteId.', {
        res: c.res,
      });
    }
    const { prioriteId } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const updatedRequete = await updatePrioriteRequete(id, topEntiteId, prioriteId);

    logger.info({ requeteId: id, userId, prioriteId }, 'Priorite updated successfully');

    return c.json({ data: updatedRequete });
  })

  .post('/:id/situation', zValidator('json', UpdateSituationBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const userId = c.get('userId');
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to update requetes without topEntiteId.', {
        res: c.res,
      });
    }
    const { situation: situationData } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const fileIds = situationData.fait?.fileIds || [];
    if (fileIds.length > 0) {
      const isAllowed = await isUserOwner(userId, fileIds);

      if (!isAllowed) {
        throwHTTPException403Forbidden('You are not allowed to add these files to the situation', {
          res: c.res,
        });
      }
    }

    const updatedRequete = await createRequeteSituation(id, situationData, topEntiteId, userId);

    sseEventManager.emitRequeteUpdated({
      requeteId: id,
      entiteId: topEntiteId,
      field: REQUETE_UPDATE_FIELDS.SITUATION,
    });

    if (requeteEntite.statutId !== REQUETE_STATUT_TYPES.EN_COURS) {
      await updateStatusRequete(id, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
    }

    logger.info({ requeteId: id, userId, fileCount: fileIds.length }, 'Situation created successfully');

    return c.json({ data: updatedRequete });
  })

  .patch('/:id/situation/:situationId', zValidator('json', UpdateSituationBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id, situationId } = c.req.param();
    const userId = c.get('userId');
    const topEntiteId = c.get('topEntiteId');
    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to update requetes without topEntiteId.', {
        res: c.res,
      });
    }
    const { situation: situationData } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);

    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const fileIds = situationData.fait?.fileIds || [];
    if (fileIds.length > 0) {
      const isAllowed = await isUserOwner(userId, fileIds);

      if (!isAllowed) {
        throwHTTPException403Forbidden('You are not allowed to add these files to the situation', {
          res: c.res,
        });
      }
    }

    const updatedRequete = await updateRequeteSituation(id, situationId, situationData, topEntiteId, userId);

    sseEventManager.emitRequeteUpdated({
      requeteId: id,
      entiteId: topEntiteId,
      field: REQUETE_UPDATE_FIELDS.SITUATION,
    });

    if (requeteEntite.statutId !== REQUETE_STATUT_TYPES.EN_COURS) {
      await updateStatusRequete(id, topEntiteId, REQUETE_STATUT_TYPES.EN_COURS);
    }

    logger.info({ requeteId: id, situationId, userId, fileCount: fileIds.length }, 'Situation updated successfully');

    return c.json({ data: updatedRequete });
  })

  .post(
    '/:id/close',
    closeRequeteRoute,
    zValidator('json', CloseRequeteBodySchema),
    requeteStatesChangelogMiddleware({ action: ChangeLogAction.CREATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id } = c.req.param();
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to close requetes without topEntiteId.', {
          res: c.res,
        });
      }
      const { reasonId, precision, fileIds } = c.req.valid('json');

      try {
        const hasAccessToReq = await hasAccessToRequete({ requeteId: id, entiteId: topEntiteId });
        if (!hasAccessToReq) {
          throwHTTPException403Forbidden('You are not allowed to close this requete', {
            res: c.res,
          });
        }

        const result = await closeRequeteForEntite(id, topEntiteId, reasonId, userId, precision, fileIds);

        c.set('changelogId', result.etapeId);

        sseEventManager.emitRequeteUpdated({
          requeteId: id,
          entiteId: topEntiteId,
          field: REQUETE_UPDATE_FIELDS.CLOSED,
        });

        logger.info(
          {
            requeteId: id,
            entiteId: topEntiteId,
            userId,
            reasonId,
            fileCount: fileIds?.length || 0,
            hasPrecision: !!precision,
          },
          'Requête closed successfully',
        );

        return c.json({ data: result });
      } catch (error: unknown) {
        if (error instanceof Error) {
          switch (error.message) {
            // biome-ignore lint/suspicious/noFallthroughSwitchClause: throwHTTPException404NotFound is throwing error
            case 'REQUETE_NOT_FOUND':
              throwHTTPException404NotFound('Requête not found', { res: c.res });
            case 'REASON_INVALID':
              return c.json({ error: 'REASON_INVALID', message: 'Invalid reason provided' }, 400);
            case 'READONLY_FOR_ENTITY':
              return c.json(
                { error: 'READONLY_FOR_ENTITY', message: 'Requête is already closed for this entity' },
                403,
              );
            case 'FILES_INVALID':
              return c.json({ error: 'FILES_INVALID', message: 'Invalid files provided' }, 400);
            default:
              if ('status' in error && error.status === 403) {
                return c.json({ error: 'Unauthorized', message: 'You are not allowed to close this requete' }, 403);
              }
              logger.error({ requeteId: id, err: error }, 'Unexpected error closing requête');
              Sentry.captureException(error);
              return c.json({ error: 'INTERNAL_ERROR', message: 'Internal server error' }, 500);
          }
        }
        throw error;
      }
    },
  );

export default app;
