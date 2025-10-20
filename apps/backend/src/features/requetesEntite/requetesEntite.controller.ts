import { throwHTTPException403Forbidden, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getEntiteAscendanteIds } from '@/features/entites/entites.service';
import { addProcessingEtape, getRequeteEtapes } from '@/features/requeteEtapes/requetesEtapes.service';
import {
  getUploadedFileById,
  isFileBelongsToRequete,
  isUserOwner,
  setRequeteFile,
} from '@/features/uploadedFiles/uploadedFiles.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { streamFileResponse } from '@/helpers/file';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteChangelogMiddleware from '@/middlewares/changelog/changelog.requete.middleware';
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
  UpdateRequeteFilesBodySchema,
  UpdateSituationBodySchema,
} from './requetesEntite.schema';
import {
  createRequeteEntite,
  getRequeteEntiteById,
  getRequetesEntite,
  updateRequeteDeclarant,
  updateRequeteParticipant,
  updateRequeteSituation,
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
    const entiteIds = c.get('entiteIds');
    const { data, total } = await getRequetesEntite(entiteIds, query);

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

    const topUserEntite = entiteIds[0];

    if (!topUserEntite) {
      return throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const topEntite = await getEntiteAscendanteIds(topUserEntite);

    const requeteEntite = await getRequeteEntiteById(id, topEntite);

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

    const topEntite = entiteIds[0] ? [entiteIds[0]] : [];

    const { data, total } = await getRequeteEtapes(id, topEntite, {});

    logger.info({ requestId: id, stepCount: total }, 'Processing steps retrieved successfully');

    return c.json({ data, meta: { total } });
  })

  .get('/:id/file/:fileId', async (c) => {
    const logger = c.get('logger');
    const { id, fileId } = c.req.param();
    const entiteIds = c.get('entiteIds');

    const topEntite = entiteIds[0] ? [entiteIds[0]] : [];

    const requeteEntite = await getRequeteEntiteById(id, topEntite);

    if (!requeteEntite) {
      return throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const file = await getUploadedFileById(fileId, null);

    if (!file) {
      return throwHTTPException404NotFound('File not found', { res: c.res });
    }

    const belongsToRequete = await isFileBelongsToRequete(fileId, id);

    if (!belongsToRequete) {
      logger.warn({ requeteId: id, fileId }, 'Attempt to access file not belonging to requete');
      return throwHTTPException403Forbidden('File does not belong to this requete', { res: c.res });
    }

    logger.info({ requeteId: id, fileId }, 'Retrieving file for requete');

    return streamFileResponse(c, file);
  })

  // Roles with edit permissions
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

  .post(
    '/',
    createRequeteRoute,
    zValidator('json', CreateRequeteBodySchema),
    requeteChangelogMiddleware({ action: ChangeLogAction.CREATED }),
    async (c) => {
      const logger = c.get('logger');
      const userId = c.get('userId');
      const entiteIds = c.get('entiteIds');
      const body = c.req.valid('json');
      const fileIds = body.fileIds || [];

      if (fileIds.length > 0) {
        const isAllowed = await isUserOwner(userId, fileIds);

        if (!isAllowed) {
          return throwHTTPException403Forbidden('You are not allowed to add these files to the requete', {
            res: c.res,
          });
        }
      }

      const requete = await createRequeteEntite(entiteIds, body);

      if (fileIds.length > 0) {
        const entiteId = entiteIds?.[0];
        await setRequeteFile(requete.id, fileIds, entiteId);
        logger.info({ requeteId: requete.id, fileIds }, 'Files linked to requete successfully');
      }

      c.set('changelogId', requete.id);

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
      const entiteIds = c.get('entiteIds');
      const { declarant: declarantData, controls } = c.req.valid('json');

      const requeteEntite = await getRequeteEntiteById(id, entiteIds);

      if (!requeteEntite) {
        return throwHTTPException404NotFound('Requete not found', {
          res: c.res,
        });
      }

      const updatedRequete = await updateRequeteDeclarant(id, declarantData, controls);

      // Set the declarant ID in context for changelog middleware
      if (updatedRequete.declarant) {
        c.set('changelogId', updatedRequete.declarant.id);
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

        // Set the participant ID in context for changelog middleware
        if (updatedRequete.participant) {
          c.set('changelogId', updatedRequete.participant.id);
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

  .patch('/:id/files', zValidator('json', UpdateRequeteFilesBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');
    const { fileIds } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, entiteIds);

    if (!requeteEntite) {
      return throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const isAllowed = await isUserOwner(userId, fileIds);

    if (!isAllowed) {
      return throwHTTPException403Forbidden('You are not allowed to add these files to the requete', {
        res: c.res,
      });
    }

    const entiteId = entiteIds?.[0];
    await setRequeteFile(id, fileIds, entiteId);

    logger.info({ requeteId: id, userId, fileIds }, 'Files linked to requete successfully');

    return c.json({ data: { requeteId: id, fileIds } });
  })

  .post('/:id/situation', zValidator('json', UpdateSituationBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id } = c.req.param();
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');
    const { situation: situationData } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, entiteIds);

    if (!requeteEntite) {
      return throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const updatedRequete = await updateRequeteSituation(id, undefined, situationData);

    logger.info({ requeteId: id, userId }, 'Situation created successfully');

    return c.json({ data: updatedRequete });
  })

  .patch('/:id/situation/:situationId', zValidator('json', UpdateSituationBodySchema), async (c) => {
    const logger = c.get('logger');
    const { id, situationId } = c.req.param();
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');
    const { situation: situationData } = c.req.valid('json');

    const requeteEntite = await getRequeteEntiteById(id, entiteIds);

    if (!requeteEntite) {
      return throwHTTPException404NotFound('Requete not found', {
        res: c.res,
      });
    }

    const updatedRequete = await updateRequeteSituation(id, situationId, situationData);

    logger.info({ requeteId: id, situationId, userId }, 'Situation updated successfully');

    return c.json({ data: updatedRequete });
  })

  .get('/:id/situation/:situationId/file/:fileId', async (c) => {
    const logger = c.get('logger');
    const { id, situationId, fileId } = c.req.param();
    const entiteIds = c.get('entiteIds');

    const requeteEntite = await getRequeteEntiteById(id, entiteIds);

    if (!requeteEntite) {
      return throwHTTPException404NotFound('Requete entite not found', { res: c.res });
    }

    const situation = requeteEntite.requete?.situations?.find((s) => s.id === situationId);

    if (!situation) {
      logger.warn({ requeteId: id, situationId }, 'Situation not found in requete');
      return throwHTTPException404NotFound('Situation not found', { res: c.res });
    }

    const file = await getUploadedFileById(fileId, null);

    if (!file) {
      return throwHTTPException404NotFound('File not found', { res: c.res });
    }

    const belongsToRequete = await isFileBelongsToRequete(fileId, id);

    if (!belongsToRequete) {
      logger.warn({ requeteId: id, situationId, fileId }, 'Attempt to access file not belonging to requete');
      return throwHTTPException403Forbidden('File does not belong to this requete', { res: c.res });
    }

    logger.info({ requeteId: id, situationId, fileId }, 'Retrieving file for situation');

    return streamFileResponse(c, file);
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
