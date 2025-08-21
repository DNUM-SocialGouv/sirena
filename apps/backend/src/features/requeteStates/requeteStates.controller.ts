import { Readable } from 'node:stream';
import * as Sentry from '@sentry/node';
import { throwHTTPException403Forbidden, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { stream as honoStream } from 'hono/streaming';
import { validator as zValidator } from 'hono-openapi/zod';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { addNote, getRequeteStateById, updateRequeteStateStatut } from '@/features/requeteStates/requeteStates.service';
import { getUploadedFileById, isUserOwner, setNoteFile } from '@/features/uploadedFiles/uploadedFiles.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { getFileStream } from '@/libs/minio';
import type { Prisma } from '@/libs/prisma';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteStatesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteStep.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service';
import { addRequeteStatesNoteRoute, updateRequeteStateStatutRoute } from './requeteStates.route';
import { addRequeteStatesNoteBodySchema, UpdateRequeteStateStatutSchema } from './requeteStates.schema';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER, ROLES.READER]))
  .use(entitesMiddleware)

  .get('/:id/file/:fileId', async (c) => {
    const logger = c.get('logger');
    const { id, fileId } = c.req.param();

    const requeteState = await getRequeteStateById(id);

    if (!requeteState) {
      return throwHTTPException404NotFound('RequeteState not found', { res: c.res });
    }

    // TODO: check real access with entiteIds when implemented
    //   const entiteIds = c.get('entiteIds');
    const hasAccess = await hasAccessToRequete(requeteState.requeteEntiteId, null);
    if (!hasAccess) {
      return throwHTTPException403Forbidden('You are not allowed to update this requete state', {
        res: c.res,
      });
    }

    const file = await getUploadedFileById(fileId, null);

    if (!file) {
      return throwHTTPException404NotFound('File not found', { res: c.res });
    }

    logger.info({ requeteStateId: id, fileId }, 'Retrieving file for requete state');

    const type = file.mimeType || 'application/octet-stream';
    const size = file.size;

    c.header('Content-Type', type);
    c.header(
      'Content-Disposition',
      `inline; filename="${(file.metadata as Prisma.JsonObject)?.originalName || file.fileName}"`,
    );

    if (size === 0) {
      return c.body(null, 200);
    }

    return honoStream(c, async (s) => {
      try {
        const nodeStream = await getFileStream(file.filePath);

        const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

        s.onAbort(() => {
          if ('destroy' in nodeStream) {
            nodeStream.destroy();
          }
        });

        await s.pipe(webStream);
      } catch (error) {
        logger.error({ fileId, err: error }, 'Stream error');
        Sentry.captureException(error);
        s.close();
      }
    });
  })

  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

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
        return throwHTTPException403Forbidden('You are not allowed to update this requete state', {
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
  )

  .post(
    '/:id/note',
    addRequeteStatesNoteRoute,
    zValidator('json', addRequeteStatesNoteBodySchema),
    requeteStatesChangelogMiddleware({ action: ChangeLogAction.CREATED }),
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
        return throwHTTPException403Forbidden('You are not allowed to update this requete state', {
          res: c.res,
        });
      }

      const fileIds = body.fileIds || [];
      if (fileIds.length > 0) {
        const isAllowed = await isUserOwner(userId, fileIds);

        if (!isAllowed) {
          return throwHTTPException403Forbidden('You are not allowed to add notes with these files', {
            res: c.res,
          });
        }
      }

      const note = await addNote({
        userId,
        requeteEntiteStateId: id,
        content: body.content,
        fileIds,
      });

      if (fileIds.length > 0) {
        // TODO: set requeteEntite entiteId to the note
        await setNoteFile(note.id, fileIds, null);
      }

      c.set('changelogId', note.id);

      logger.info({ requeteStateId: id, noteId: note.id, userId }, 'note added successfully');

      return c.json({ data: note }, 201);
    },
  );

export default app;
