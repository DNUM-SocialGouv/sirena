import { Readable } from 'node:stream';
import * as Sentry from '@sentry/node';
import {
  throwHTTPException401Unauthorized,
  throwHTTPException403Forbidden,
  throwHTTPException404NotFound,
} from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { stream as honoStream } from 'hono/streaming';
import { validator as zValidator } from 'hono-openapi/zod';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import {
  addNote,
  deleteNote,
  deleteRequeteEtape,
  getNoteById,
  getRequeteEtapeById,
  updateNote,
  updateRequeteEtapeNom,
  updateRequeteEtapeStatut,
} from '@/features/requeteEtapes/requetesEtapes.service';
import { getUploadedFileById, isUserOwner, setNoteFile } from '@/features/uploadedFiles/uploadedFiles.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { getFileStream } from '@/libs/minio';
import type { Prisma } from '@/libs/prisma';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteEtapesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteEtape.middleware';
import requeteEtapesNotesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteEtapeNote.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service';
import {
  addRequeteEtapesNoteRoute,
  deleteRequeteEtapeRoute,
  deleteRequeteEtapesNoteRoute,
  updateRequeteEtapeNomRoute,
  updateRequeteEtapeStatutRoute,
  updateRequeteEtapesNoteRoute,
} from './requetesEtapes.route';
import {
  addRequeteEtapeNoteBodySchema,
  UpdateRequeteEtapeNomSchema,
  UpdateRequeteEtapeStatutSchema,
  updateRequeteEtapeNoteBodySchema,
} from './requetesEtapes.schema';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER, ROLES.READER]))
  .use(userStatusMiddleware)
  .use(entitesMiddleware)

  .get('/:id/file/:fileId', async (c) => {
    const logger = c.get('logger');
    const { id, fileId } = c.req.param();

    const requeteEtape = await getRequeteEtapeById(id);

    if (!requeteEtape) {
      return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
    }

    // TODO: check real access with entiteIds when implemented
    //   const entiteIds = c.get('entiteIds');
    const hasAccess = await hasAccessToRequete({ requeteId: requeteEtape.requeteId, entiteId: requeteEtape.entiteId });
    if (!hasAccess) {
      return throwHTTPException403Forbidden('You are not allowed to update this requete etape', {
        res: c.res,
      });
    }

    const file = await getUploadedFileById(fileId, null);

    if (!file) {
      return throwHTTPException404NotFound('File not found', { res: c.res });
    }

    logger.info({ requeteEtapeId: id, fileId }, 'Retrieving file for requete etape');

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

  .post(
    '/:id/note',
    addRequeteEtapesNoteRoute,
    zValidator('json', addRequeteEtapeNoteBodySchema),
    requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.CREATED }),
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
        return throwHTTPException403Forbidden('You are not allowed to add notes to this requete etape', {
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
        requeteEtapeId: id,
        texte: body.texte,
        fileIds,
      });

      if (fileIds.length > 0) {
        // TODO: set requeteEntite entiteId to the note
        await setNoteFile(note.id, fileIds, null);
      }

      c.set('changelogId', note.id);

      logger.info({ requeteEtapeId: id, noteId: note.id, userId }, 'note added successfully');

      return c.json({ data: note }, 201);
    },
  )

  .patch(
    '/:id/note/:noteId',
    updateRequeteEtapesNoteRoute,
    zValidator('json', updateRequeteEtapeNoteBodySchema),
    requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id, noteId } = c.req.param();
      const body = c.req.valid('json');
      const userId = c.get('userId');

      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      const hasAccess = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: requeteEtape.entiteId,
      });
      if (!hasAccess) {
        return throwHTTPException403Forbidden('You are not allowed to update this requete etape', {
          res: c.res,
        });
      }

      const existingNote = await getNoteById(noteId);

      if (!existingNote) {
        return throwHTTPException404NotFound('Note not found', { res: c.res });
      }

      const updatedNote = await updateNote(noteId, body.texte);

      const fileIds = body.fileIds || [];
      if (fileIds.length > 0) {
        const isAllowed = await isUserOwner(userId, fileIds);

        if (!isAllowed) {
          return throwHTTPException403Forbidden('You are not allowed to add these files to the note', {
            res: c.res,
          });
        }

        // TODO: set requeteEntite entiteId to the note
        await setNoteFile(noteId, fileIds, null);
      }

      c.set('changelogId', noteId);

      logger.info({ requeteEtapeId: id, noteId, userId, fileIdsAdded: fileIds.length }, 'note updated successfully');

      return c.json({ data: updatedNote });
    },
  )

  .delete(
    '/:id/note/:noteId',
    deleteRequeteEtapesNoteRoute,
    requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.DELETED }),
    async (c) => {
      const logger = c.get('logger');
      const { id, noteId } = c.req.param();
      const userId = c.get('userId');

      const requeteEtape = await getRequeteEtapeById(id);

      if (!requeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      const hasAccess = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: requeteEtape.entiteId,
      });
      if (!hasAccess) {
        return throwHTTPException403Forbidden('You are not allowed to delete notes from this requete etape', {
          res: c.res,
        });
      }

      const existingNote = await getNoteById(noteId);

      if (!existingNote) {
        return throwHTTPException404NotFound('Note not found', { res: c.res });
      }

      await deleteNote(noteId, logger, userId);

      c.set('changelogId', noteId);

      logger.info({ requeteEtapeId: id, noteId, userId }, 'note deleted successfully');

      return c.body(null, 204);
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
